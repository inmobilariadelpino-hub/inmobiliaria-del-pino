import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

// Fases del flujo: subir el archivo → procesar con IA → confirmar datos.
const CIUDADES = ['Toledo', 'Pinto', 'Madrid']

export default function SubirContrato() {
  const navigate = useNavigate()
  const [fase, setFase] = useState('subir') // subir | procesando | confirmar
  const [error, setError] = useState('')
  const [archivo, setArchivo] = useState(null)
  const [documentoId, setDocumentoId] = useState(null)
  const [pisos, setPisos] = useState([])
  const [guardando, setGuardando] = useState(false)

  // Datos del formulario de confirmación
  const [form, setForm] = useState(null)

  useEffect(() => {
    supabase
      .from('propiedades')
      .select('id, nombre, direccion, ciudad')
      .order('nombre', { ascending: true })
      .then(({ data }) => setPisos(data ?? []))
  }, [])

  function elegirArchivo(e) {
    setError('')
    const f = e.target.files?.[0]
    if (f) setArchivo(f)
  }

  async function subirYProcesar() {
    if (!archivo) return
    setError('')
    setFase('procesando')

    // 1. Subir al bucket privado documentos
    const ext = archivo.name.split('.').pop()
    const ruta = `contratos/${crypto.randomUUID()}.${ext}`
    const { error: errUp } = await supabase.storage
      .from('documentos')
      .upload(ruta, archivo, { contentType: archivo.type })
    if (errUp) {
      setError('No se pudo subir el archivo.')
      setFase('subir')
      return
    }

    // 2. Crear la fila en documentos
    const { data: doc, error: errDoc } = await supabase
      .from('documentos')
      .insert({
        tipo: 'contrato',
        nombre_archivo: archivo.name,
        storage_path: ruta,
        estado_procesamiento: 'pendiente',
      })
      .select('id')
      .single()
    if (errDoc || !doc) {
      setError('No se pudo registrar el documento.')
      setFase('subir')
      return
    }
    setDocumentoId(doc.id)

    // 3. Invocar la Edge Function de extracción
    const { data: res, error: errFn } = await supabase.functions.invoke(
      'extraer-contrato',
      { body: { documento_id: doc.id } }
    )
    if (errFn || !res?.datos) {
      setError('No se pudieron extraer los datos. Puedes rellenarlos a mano.')
      inicializarForm({})
      setFase('confirmar')
      return
    }

    inicializarForm(res.datos)
    setFase('confirmar')
  }

  function inicializarForm(d) {
    setForm({
      propiedad_id: d.propiedad_id ?? '',
      piso_direccion: d.piso_direccion ?? '',
      piso_ciudad: d.piso_ciudad ?? '',
      crear_piso: !d.propiedad_id,
      inquilino_nombre: d.inquilino_nombre ?? '',
      inquilino_dni: d.inquilino_dni ?? '',
      inquilino_telefono: d.inquilino_telefono ?? '',
      fecha_inicio: d.fecha_inicio ?? '',
      fecha_fin: d.fecha_fin ?? '',
      renta_mensual: d.renta_mensual ?? '',
      dia_pago: d.dia_pago ?? 1,
      fianza: d.fianza ?? '',
    })
  }

  function cambiar(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }))
  }

  async function confirmar(e) {
    e.preventDefault()
    setError('')

    if (!form.inquilino_nombre.trim()) {
      setError('El nombre del inquilino es obligatorio.')
      return
    }
    if (!form.fecha_inicio || !form.renta_mensual) {
      setError('La fecha de inicio y la renta son obligatorias.')
      return
    }
    if (!form.crear_piso && !form.propiedad_id) {
      setError('Elige un piso o marca "crear piso nuevo".')
      return
    }
    if (form.crear_piso && (!form.piso_direccion.trim() || !form.piso_ciudad.trim())) {
      setError('Para crear el piso hacen falta dirección y ciudad.')
      return
    }

    setGuardando(true)

    // 1. Piso: usar el existente o crear uno nuevo
    let propiedadId = form.propiedad_id
    if (form.crear_piso) {
      const { data: piso, error: errP } = await supabase
        .from('propiedades')
        .insert({
          nombre: form.piso_direccion.trim(),
          direccion: form.piso_direccion.trim(),
          ciudad: form.piso_ciudad.trim(),
        })
        .select('id')
        .single()
      if (errP || !piso) return fallo('No se pudo crear el piso.')
      propiedadId = piso.id
    }

    // 2. Inquilino nuevo (al confirmar)
    const { data: inq, error: errI } = await supabase
      .from('inquilinos')
      .insert({
        nombre: form.inquilino_nombre.trim(),
        dni: form.inquilino_dni.trim() || null,
        telefono: form.inquilino_telefono.trim() || null,
      })
      .select('id')
      .single()
    if (errI || !inq) return fallo('No se pudo crear el inquilino.')

    // 3. Contrato, enlazando el documento subido
    const { error: errC } = await supabase.from('contratos').insert({
      propiedad_id: propiedadId,
      inquilino_id: inq.id,
      fecha_inicio: form.fecha_inicio,
      fecha_fin: form.fecha_fin || null,
      renta_mensual: Number(form.renta_mensual),
      dia_pago: Number(form.dia_pago) || 1,
      fianza: form.fianza === '' ? null : Number(form.fianza),
      documento_id: documentoId,
    })
    if (errC) return fallo('No se pudo crear el contrato.')

    // 4. Marcar el documento como confirmado
    await supabase
      .from('documentos')
      .update({ estado_procesamiento: 'confirmado' })
      .eq('id', documentoId)

    setGuardando(false)
    navigate('/pisos')
  }

  function fallo(msg) {
    setGuardando(false)
    setError(msg)
  }

  return (
    <>
      <header className="app-cabecera">
        <div className="marca">
          <div className="marca-pino" aria-hidden="true">🌲</div>
          <div className="marca-nombre">
            Inmobiliaria del Pino
            <small>Gestión de alquileres</small>
          </div>
        </div>
        <div className="app-cabecera-acciones">
          <Link to="/" className="enlace-cabecera">Volver al panel</Link>
          <button onClick={() => supabase.auth.signOut()}>Salir</button>
        </div>
      </header>

      <main className="contenido">
        <h1>Subir contrato</h1>
        <p className="subtitulo">
          Haz una foto o elige el PDF del contrato. La IA extraerá los datos
          para que los revises antes de guardar.
        </p>

        {error && <div className="aviso-error">{error}</div>}

        {fase === 'subir' && (
          <div className="tarjeta formulario">
            <div className="campo">
              <label htmlFor="archivo">Foto o PDF del contrato</label>
              <input
                id="archivo"
                type="file"
                accept="image/*,application/pdf"
                capture="environment"
                onChange={elegirArchivo}
              />
            </div>
            {archivo && <p className="subtitulo">Seleccionado: {archivo.name}</p>}
            <button onClick={subirYProcesar} disabled={!archivo}>
              Subir y extraer datos
            </button>
          </div>
        )}

        {fase === 'procesando' && (
          <div className="tarjeta formulario">
            <p className="subtitulo">
              Subiendo y leyendo el contrato con la IA… esto puede tardar unos
              segundos.
            </p>
          </div>
        )}

        {fase === 'confirmar' && form && (
          <form className="tarjeta formulario" onSubmit={confirmar}>
            <h3>Revisa los datos</h3>

            <div className="campo">
              <label>Piso</label>
              {!form.crear_piso ? (
                <select
                  value={form.propiedad_id}
                  onChange={(e) => cambiar('propiedad_id', e.target.value)}
                >
                  <option value="">— Elige un piso —</option>
                  {pisos.map((p) => (
                    <option value={p.id} key={p.id}>
                      {p.nombre} · {p.ciudad}
                    </option>
                  ))}
                </select>
              ) : (
                <>
                  <input
                    type="text"
                    value={form.piso_direccion}
                    onChange={(e) => cambiar('piso_direccion', e.target.value)}
                    placeholder="Dirección del piso"
                  />
                  <input
                    style={{ marginTop: '0.5rem' }}
                    type="text"
                    list="ciudades-contrato"
                    value={form.piso_ciudad}
                    onChange={(e) => cambiar('piso_ciudad', e.target.value)}
                    placeholder="Ciudad"
                  />
                  <datalist id="ciudades-contrato">
                    {CIUDADES.map((c) => (
                      <option value={c} key={c} />
                    ))}
                  </datalist>
                </>
              )}
              <label className="check">
                <input
                  type="checkbox"
                  checked={form.crear_piso}
                  onChange={(e) => cambiar('crear_piso', e.target.checked)}
                />
                Crear un piso nuevo con esta dirección
              </label>
            </div>

            <div className="campo">
              <label htmlFor="inq-nombre">Inquilino</label>
              <input
                id="inq-nombre"
                type="text"
                value={form.inquilino_nombre}
                onChange={(e) => cambiar('inquilino_nombre', e.target.value)}
                placeholder="Nombre completo"
              />
            </div>
            <div className="campos-fila">
              <div className="campo">
                <label htmlFor="inq-dni">DNI</label>
                <input
                  id="inq-dni"
                  type="text"
                  value={form.inquilino_dni}
                  onChange={(e) => cambiar('inquilino_dni', e.target.value)}
                />
              </div>
              <div className="campo">
                <label htmlFor="inq-tel">Teléfono</label>
                <input
                  id="inq-tel"
                  type="text"
                  value={form.inquilino_telefono}
                  onChange={(e) => cambiar('inquilino_telefono', e.target.value)}
                />
              </div>
            </div>

            <div className="campos-fila">
              <div className="campo">
                <label htmlFor="f-inicio">Fecha inicio</label>
                <input
                  id="f-inicio"
                  type="date"
                  value={form.fecha_inicio}
                  onChange={(e) => cambiar('fecha_inicio', e.target.value)}
                />
              </div>
              <div className="campo">
                <label htmlFor="f-fin">Fecha fin</label>
                <input
                  id="f-fin"
                  type="date"
                  value={form.fecha_fin}
                  onChange={(e) => cambiar('fecha_fin', e.target.value)}
                />
              </div>
            </div>

            <div className="campos-fila">
              <div className="campo">
                <label htmlFor="renta">Renta mensual (€)</label>
                <input
                  id="renta"
                  type="number"
                  step="0.01"
                  value={form.renta_mensual}
                  onChange={(e) => cambiar('renta_mensual', e.target.value)}
                />
              </div>
              <div className="campo">
                <label htmlFor="dia">Día de pago</label>
                <input
                  id="dia"
                  type="number"
                  min="1"
                  max="31"
                  value={form.dia_pago}
                  onChange={(e) => cambiar('dia_pago', e.target.value)}
                />
              </div>
              <div className="campo">
                <label htmlFor="fianza">Fianza (€)</label>
                <input
                  id="fianza"
                  type="number"
                  step="0.01"
                  value={form.fianza}
                  onChange={(e) => cambiar('fianza', e.target.value)}
                />
              </div>
            </div>

            <button type="submit" disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar contrato'}
            </button>
          </form>
        )}
      </main>
    </>
  )
}
