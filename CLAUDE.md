# Inmobiliaria del Pino — contexto del proyecto

## Qué es

Aplicación web **interna y familiar** para gestionar los pisos en alquiler de
larga duración de la madre del propietario del repo. Pisos en Toledo, Pinto y
Madrid. El acceso está restringido a una lista blanca de administradores
gestionada desde la propia app (tabla `administradores`); esa lista arranca con
la madre y el hijo, pero puede crecer. Login vía Google (sin gestión propia de
contraseñas).

## Stack y decisiones tomadas (no cambiar sin consultar)

- **Frontend**: React + Vite, SPA estática. Sin frameworks de servidor.
- **Hosting**: GitHub Pages, desplegado por el workflow
  `.github/workflows/deploy.yml` (Source: GitHub Actions). Dominio
  `inmobiliariadelpino.es` (registrado en Hostinger, `public/CNAME` ya fijado).
- **Backend**: Supabase — Postgres, Auth (**Google OAuth como único
  proveedor**; el acceso se restringe con la tabla `administradores` y RLS
  basado en `auth.jwt() ->> 'email'`), Storage (bucket privado `documentos`)
  y Edge Functions.
- **IA**: API de Anthropic, llamada SOLO desde Edge Functions de Supabase
  (nunca desde el navegador; la clave API vive como secreto de la función).
- **Estilo de código**: español para nombres de variables, componentes, rutas
  y textos de UI. Diseño según tokens de `src/styles.css` (verde pino + ámbar,
  Bricolage Grotesque para títulos, Instrument Sans para texto).

## Esquema de base de datos

En `supabase/esquema_v1.sql` (tablas base) y `supabase/migracion_admins.sql`
(tabla `administradores` + RLS por email). Tablas: `propiedades`,
`inquilinos`, `contratos`, `ingresos` (una fila por contrato+mes, estado
pagado/pendiente), `gastos`, `documentos` (archivo en Storage +
`datos_extraidos` jsonb que rellena la IA y el usuario confirma),
`administradores` (email, activo). RLS: todas las tablas comprueban
`es_admin()` (que mira el JWT y busca el email en `administradores`).

## Fase 1 (alcance actual)

1. CRUD de pisos e inquilinos.
2. Contratos: alta, fechas, renta, fianza, estado.
3. Ingresos: vista mensual, marcar pagado/pendiente, alta manual.
4. Gastos: alta manual con categoría.
5. Subida de documentos (foto/PDF) a Storage + Edge Function que llama a la
   API de Anthropic para extraer datos (factura, contrato o página de
   cuaderno manuscrito), formulario pre-rellenado que el usuario revisa y
   confirma antes de guardar.
6. Panel resumen: rentas del mes cobradas/pendientes, últimos gastos.

Fase 1.5: importación de extracto bancario CSV con conciliación de ingresos.
Fase 2 (NO construir aún): avisos de vencimientos, informes fiscales,
sincronización bancaria directa.

## Convenciones de trabajo

- La app debe funcionar bien en móvil (la madre la usará desde el teléfono,
  especialmente la cámara para subir documentos). Priorizar claridad y
  tamaños de texto legibles.
- Si `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` faltan, la app muestra un
  aviso y no rompe (ver `src/lib/supabase.js`). Mantener ese comportamiento.
- No introducir gestión de estado compleja ni librerías UI grandes sin
  necesidad; el proyecto debe seguir siendo mantenible por una persona.
- Commits en español, pequeños y descriptivos.
