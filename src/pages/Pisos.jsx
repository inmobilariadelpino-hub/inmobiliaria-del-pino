import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

export default function Pisos() {
  const [pisos, setPisos] = useState([])
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    cargar()
  }, [])

  async function cargar() {
    setCargando(true)
    const { data, error: err } = await supabase
      .from('propiedades')
      .select('*')
      .order('creado_en', { ascending: true })
    if (err) setError('No se pudo cargar la lista de pisos.')
    else setPisos(data)
    setCargando(false)
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
        <div className="cabecera-seccion">
          <div>
            <h1>Pisos</h1>
            <p className="subtitulo">Viviendas en alquiler de larga duración.</p>
          </div>
          <Link to="/pisos/nuevo" className="boton-enlace">Añadir piso</Link>
        </div>

        {error && <div className="aviso-error">{error}</div>}

        {cargando ? (
          <p className="subtitulo">Cargando…</p>
        ) : pisos.length === 0 ? (
          <p className="subtitulo">Todavía no hay pisos. Añade el primero.</p>
        ) : (
          <div className="tarjetas">
            {pisos.map((p) => (
              <Link to={`/pisos/${p.id}`} className="tarjeta tarjeta-enlace" key={p.id}>
                <h3>{p.nombre}</h3>
                <p>{p.direccion}</p>
                <p className="piso-ciudad">{p.ciudad}</p>
                {(p.metros_cuadrados || p.habitaciones) && (
                  <p className="piso-datos">
                    {p.metros_cuadrados ? `${p.metros_cuadrados} m²` : ''}
                    {p.metros_cuadrados && p.habitaciones ? ' · ' : ''}
                    {p.habitaciones
                      ? `${p.habitaciones} ${p.habitaciones === 1 ? 'habitación' : 'habitaciones'}`
                      : ''}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  )
}
