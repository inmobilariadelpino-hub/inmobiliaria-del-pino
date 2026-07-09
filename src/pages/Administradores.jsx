import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

export default function Administradores({ sesion }) {
  const [admins, setAdmins] = useState([])
  const [nuevoEmail, setNuevoEmail] = useState('')
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)

  const emailPropio = sesion.user.email

  useEffect(() => {
    cargar()
  }, [])

  async function cargar() {
    setCargando(true)
    const { data, error: err } = await supabase
      .from('administradores')
      .select('*')
      .order('creado_en', { ascending: true })
    if (err) setError('No se pudo cargar la lista de administradores.')
    else setAdmins(data)
    setCargando(false)
  }

  async function anadir(e) {
    e.preventDefault()
    setError('')
    const email = nuevoEmail.trim().toLowerCase()
    if (!email) return
    setGuardando(true)
    const { error: err } = await supabase
      .from('administradores')
      .insert({ email, nombre: nuevoNombre.trim() || null })
    setGuardando(false)
    if (err) {
      setError(
        err.code === '23505'
          ? 'Ese email ya está en la lista.'
          : 'No se pudo añadir el administrador.'
      )
      return
    }
    setNuevoEmail('')
    setNuevoNombre('')
    cargar()
  }

  async function cambiarActivo(admin) {
    setError('')
    if (admin.email.toLowerCase() === emailPropio.toLowerCase() && admin.activo) {
      setError('No puedes desactivarte a ti mismo.')
      return
    }
    const { error: err } = await supabase
      .from('administradores')
      .update({ activo: !admin.activo })
      .eq('id', admin.id)
    if (err) setError('No se pudo cambiar el estado.')
    else cargar()
  }

  async function eliminar(admin) {
    setError('')
    if (admin.email.toLowerCase() === emailPropio.toLowerCase()) {
      setError('No puedes eliminarte a ti mismo.')
      return
    }
    if (!confirm(`¿Eliminar a ${admin.email}?`)) return
    const { error: err } = await supabase
      .from('administradores')
      .delete()
      .eq('id', admin.id)
    if (err) setError('No se pudo eliminar.')
    else cargar()
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
        <h1>Administradores</h1>
        <p className="subtitulo">
          Personas con acceso a la aplicación. Solo cuentas de Google en esta
          lista pueden entrar.
        </p>

        {error && <div className="aviso-error">{error}</div>}

        <form className="tarjeta formulario" onSubmit={anadir}>
          <h3>Añadir administrador</h3>
          <div className="campo">
            <label htmlFor="nuevo-email">Email de Google</label>
            <input
              id="nuevo-email"
              type="email"
              required
              value={nuevoEmail}
              onChange={(e) => setNuevoEmail(e.target.value)}
              placeholder="ejemplo@gmail.com"
            />
          </div>
          <div className="campo">
            <label htmlFor="nuevo-nombre">Nombre (opcional)</label>
            <input
              id="nuevo-nombre"
              type="text"
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              placeholder="Cómo se llama"
            />
          </div>
          <button type="submit" disabled={guardando || !nuevoEmail}>
            {guardando ? 'Guardando…' : 'Añadir'}
          </button>
        </form>

        <div className="lista-admins">
          <h3>Lista actual</h3>
          {cargando ? (
            <p className="subtitulo">Cargando…</p>
          ) : admins.length === 0 ? (
            <p className="subtitulo">Todavía no hay administradores.</p>
          ) : (
            <ul>
              {admins.map((a) => {
                const esYo = a.email.toLowerCase() === emailPropio.toLowerCase()
                return (
                  <li key={a.id} className={a.activo ? '' : 'inactivo'}>
                    <div className="admin-info">
                      <strong>{a.email}</strong>
                      {a.nombre && <span className="admin-nombre">{a.nombre}</span>}
                      {esYo && <span className="etiqueta">tú</span>}
                      {!a.activo && <span className="etiqueta apagada">inactivo</span>}
                    </div>
                    <div className="admin-acciones">
                      <button
                        className="secundario"
                        onClick={() => cambiarActivo(a)}
                        disabled={esYo && a.activo}
                      >
                        {a.activo ? 'Desactivar' : 'Activar'}
                      </button>
                      <button
                        className="secundario peligro"
                        onClick={() => eliminar(a)}
                        disabled={esYo}
                      >
                        Eliminar
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </main>
    </>
  )
}
