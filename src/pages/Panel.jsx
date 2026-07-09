import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

const secciones = [
  {
    titulo: 'Pisos',
    texto: 'Fichas de las viviendas de Toledo, Pinto y Madrid con sus contratos y documentos.',
    ruta: '/pisos',
  },
  {
    titulo: 'Inquilinos y contratos',
    texto: 'Quién vive en cada piso, rentas, fechas y fianzas.',
  },
  {
    titulo: 'Ingresos',
    texto: 'Rentas cobradas y pendientes de cada mes, con registro manual o importado.',
  },
  {
    titulo: 'Gastos',
    texto: 'IBI, comunidad, reparaciones y seguros de cada vivienda.',
  },
  {
    titulo: 'Subir documento',
    texto: 'Fotografía un contrato, una factura o una página del cuaderno y la IA extrae los datos para que los confirmes.',
  },
]

export default function Panel({ sesion }) {
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
          <Link to="/administradores" className="enlace-cabecera">Administradores</Link>
          <button onClick={() => supabase.auth.signOut()}>Salir</button>
        </div>
      </header>

      <main className="contenido">
        <h1>Hola{sesion?.user?.email ? `, ${sesion.user.email}` : ''}</h1>
        <p className="subtitulo">
          La base está desplegada y funcionando. Estas son las secciones que
          iremos activando.
        </p>

        <div className="tarjetas">
          {secciones.map((s) =>
            s.ruta ? (
              <Link className="tarjeta tarjeta-enlace" to={s.ruta} key={s.titulo}>
                <h3>{s.titulo}</h3>
                <p>{s.texto}</p>
              </Link>
            ) : (
              <div className="tarjeta" key={s.titulo}>
                <h3>{s.titulo}</h3>
                <p>{s.texto}</p>
                <span className="proximamente">Próximamente</span>
              </div>
            )
          )}
        </div>
      </main>
    </>
  )
}
