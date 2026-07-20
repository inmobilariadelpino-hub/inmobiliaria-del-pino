// Edge Function: extraer-contrato
// Recibe { documento_id }, descarga el archivo del bucket privado
// "documentos", lo manda a la API de Anthropic (visión) para extraer los
// datos del contrato de alquiler, intenta casar la dirección con una
// propiedad existente y guarda el resultado en documentos.datos_extraidos.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MEDIA_IMAGEN = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

const INSTRUCCIONES = `Eres un asistente que extrae datos de contratos de alquiler de vivienda en España.
Del documento adjunto (foto o PDF de un contrato) extrae los datos y responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional ni markdown, con esta forma exacta:
{
  "piso_direccion": string | null,   // dirección completa de la vivienda alquilada
  "piso_ciudad": string | null,      // ciudad (p. ej. Toledo, Pinto, Madrid)
  "inquilino_nombre": string | null, // nombre completo del arrendatario
  "inquilino_dni": string | null,
  "inquilino_telefono": string | null,
  "fecha_inicio": string | null,     // formato AAAA-MM-DD
  "fecha_fin": string | null,        // formato AAAA-MM-DD o null si indefinido
  "renta_mensual": number | null,    // solo el número, en euros
  "dia_pago": number | null,         // día del mes de pago (1-31)
  "fianza": number | null            // importe de la fianza en euros
}
Si un dato no aparece en el documento, usa null. No inventes valores.`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const { documento_id } = await req.json()
    if (!documento_id) {
      return json({ error: 'Falta documento_id' }, 400)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Localizar el documento y su ruta en Storage
    const { data: doc, error: errDoc } = await supabase
      .from('documentos')
      .select('id, storage_path, nombre_archivo')
      .eq('id', documento_id)
      .single()
    if (errDoc || !doc) return json({ error: 'Documento no encontrado' }, 404)

    // 2. Descargar el archivo del bucket privado
    const { data: archivo, error: errDl } = await supabase.storage
      .from('documentos')
      .download(doc.storage_path)
    if (errDl || !archivo) return json({ error: 'No se pudo descargar el archivo' }, 500)

    const mediaType = archivo.type || inferirTipo(doc.nombre_archivo)
    const base64 = await aBase64(archivo)

    // 3. Construir el bloque de contenido (imagen o PDF) para Anthropic
    const bloqueArchivo = MEDIA_IMAGEN.includes(mediaType)
      ? { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } }
      : { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }

    // 4. Llamar a la API de Anthropic
    const respuesta = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [{ type: 'text', text: INSTRUCCIONES }, bloqueArchivo],
          },
        ],
      }),
    })

    if (!respuesta.ok) {
      const detalle = await respuesta.text()
      return json({ error: 'Error al llamar a la IA', detalle }, 502)
    }

    const cuerpo = await respuesta.json()
    const texto = cuerpo?.content?.[0]?.text ?? ''
    const datos = parsearJson(texto)
    if (!datos) return json({ error: 'La IA no devolvió un JSON válido', texto }, 502)

    // 5. Intentar casar la dirección con una propiedad existente
    let propiedad_id: string | null = null
    if (datos.piso_direccion) {
      const { data: pisos } = await supabase
        .from('propiedades')
        .select('id, direccion')
      propiedad_id = casarPiso(datos.piso_direccion, pisos ?? [])
    }
    datos.propiedad_id = propiedad_id

    // 6. Guardar lo extraído en el documento
    await supabase
      .from('documentos')
      .update({ datos_extraidos: datos, estado_procesamiento: 'procesado' })
      .eq('id', documento_id)

    return json({ datos })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, 'content-type': 'application/json' },
  })
}

async function aBase64(blob: Blob): Promise<string> {
  const buffer = new Uint8Array(await blob.arrayBuffer())
  let binario = ''
  const trozo = 0x8000
  for (let i = 0; i < buffer.length; i += trozo) {
    binario += String.fromCharCode(...buffer.subarray(i, i + trozo))
  }
  return btoa(binario)
}

function inferirTipo(nombre: string): string {
  const n = nombre.toLowerCase()
  if (n.endsWith('.pdf')) return 'application/pdf'
  if (n.endsWith('.png')) return 'image/png'
  if (n.endsWith('.webp')) return 'image/webp'
  if (n.endsWith('.gif')) return 'image/gif'
  return 'image/jpeg'
}

function parsearJson(texto: string): Record<string, any> | null {
  try {
    return JSON.parse(texto)
  } catch {
    const inicio = texto.indexOf('{')
    const fin = texto.lastIndexOf('}')
    if (inicio === -1 || fin === -1) return null
    try {
      return JSON.parse(texto.slice(inicio, fin + 1))
    } catch {
      return null
    }
  }
}

// Casa la dirección extraída con una propiedad existente comparando
// tokens normalizados. Devuelve el id si hay una coincidencia clara.
function casarPiso(
  direccion: string,
  pisos: Array<{ id: string; direccion: string }>
): string | null {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2)

  const objetivo = new Set(norm(direccion))
  if (objetivo.size === 0) return null

  let mejor: { id: string; puntos: number } | null = null
  for (const p of pisos) {
    const tokens = norm(p.direccion)
    if (tokens.length === 0) continue
    const comunes = tokens.filter((t) => objetivo.has(t)).length
    const ratio = comunes / tokens.length
    if (ratio >= 0.6 && (!mejor || ratio > mejor.puntos)) {
      mejor = { id: p.id, puntos: ratio }
    }
  }
  return mejor?.id ?? null
}
