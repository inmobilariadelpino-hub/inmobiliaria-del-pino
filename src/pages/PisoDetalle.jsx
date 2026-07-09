import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

const CIUDADES = ['Toledo', 'Pinto', 'Madrid']

const VACIO = {
  nombre: '',
  direccion: '',
  ciudad: '',
  metros_cuadrados: '',
  habitaciones: '',
  notas: '',
}

export default function PisoDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const esNuevo = id === 'nuevo'

  const [datos, setDatos] = useState(VACIO)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(!esNuevo)
  const [guardando, setGuardando] = useState(false)
  const [borrando, setBorrando] = useState(false)

  useEffect(() => {
    if (!esNuevo) cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function cargar() {
    setCargando(true)
    const { data, error: err } = await supabase
      .from('propiedades')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (err || !data) {
      setError('No se pudo cargar el piso.')
    } else {
      setDatos({
        nombre: data.nombre ?? '',
        direccion: data.direccion ?? '',
        ciudad: data.ciudad ?? '',
        metros_cuadrados: data.metros_cuadrados ?? '',
        habitaciones: data.habitaciones ?? '',
        notas: data.notas ?? '',
      })
    }
    setCargando(false)
  }

  function cambiar(campo, valor) {
    setDatos((d) => ({ ...d, [campo]: valor }))
  }

  async function guardar(e) {
    e.preventDefault()
    setError('')
    setGuardando(true)

    const fila = {
      nombre: datos.nombre.trim(),
      direccion: datos.direccion.trim(),
      ciudad: datos.ciudad.trim(),
      metros_cuadrados: datos.metros_cuadrados === '' ? null : Number(datos.metros_cuadrados),
      habitaciones: datos.habitaciones === '' ? null : Number(datos.habitaciones),
      notas: datos.notas.trim() || null,
    }

    const { error: err } = esNuevo
      ? await supabase.from('propiedades').insert(fila)
      : await supabase.from('propiedades').update(fila).eq('id', id)

    setGuardando(false)
    if (err) {
      setError('No se pudo guardar el piso.')
      return
    }
    navigate('/pisos')
  }

  async function borrar() {
    setError('')
    setBorrando(true)

    const [{ count: nContratos }, { count: nGastos }] = await Promise.all([
      supabase.from('contratos').select('id', { count: 'exact', head: true }).eq('propiedad_id', id),
      supabase.from('gastos').select('id', { count: 'exact', head: true }).eq('propiedad_id', id),
    ])

    if (nContratos > 0 || nGastos > 0) {
      setBorrando(false)
      const partes = []
      if (nContratos > 0) partes.push(`${nContratos} contrato${nContratos === 1 ? '' : 's'}`)
      if (nGastos > 0) partes.push(`${nGastos} gasto${nGastos === 1 ? '' : 's'}`)
      setError(
        `No se puede borrar: este piso tiene ${partes.join(' y ')} asociado${
          nContratos + nGastos === 1 ? '' : 's'
        }. Finaliza los contratos en lugar de borrar el piso.`
      )
      return
    }

    if (!confirm(`¿Borrar el piso "${datos.nombre}"?`)) {
      setBorrando(false)
      return
    }

    const { error: err } = await supabase.from('propiedades').delete().eq('id', id)
    setBorrando(false)
    if (err) {
      setError('No se pudo borrar el piso.')
      return
    }
    navigate('/pisos')
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
          <Link to="/pisos" className="enlace-cabecera">Volver a pisos</Link>
          <button onClick={() => supabase.auth.signOut()}>Salir</button>
        </div>
      </header>

      <main className="contenido">
        <h1>{esNuevo ? 'Nuevo piso' : 'Editar piso'}</h1>
        <p className="subtitulo">
          {esNuevo ? 'Añade una vivienda al listado.' : 'Modifica los datos de la vivienda.'}
        </p>

        {error && <div className="aviso-error">{error}</div>}

        {cargando ? (
          <p className="subtitulo">Cargando…</p>
        ) : (
          <form className="tarjeta formulario" onSubmit={guardar}>
            <div className="campo">
              <label htmlFor="nombre">Nombre</label>
              <input
                id="nombre"
                type="text"
                required
                value={datos.nombre}
                onChange={(e) => cambiar('nombre', e.target.value)}
                placeholder="Piso Toledo"
              />
            </div>
            <div className="campo">
              <label htmlFor="direccion">Dirección</label>
              <input
                id="direccion"
                type="text"
                required
                value={datos.direccion}
                onChange={(e) => cambiar('direccion', e.target.value)}
                placeholder="Calle y número"
              />
            </div>
            <div className="campo">
              <label htmlFor="ciudad">Ciudad</label>
              <input
                id="ciudad"
                type="text"
                required
                list="ciudades"
                value={datos.ciudad}
                onChange={(e) => cambiar('ciudad', e.target.value)}
                placeholder="Toledo, Pinto o Madrid"
              />
              <datalist id="ciudades">
                {CIUDADES.map((c) => (
                  <option value={c} key={c} />
                ))}
              </datalist>
            </div>
            <div className="campos-fila">
              <div className="campo">
                <label htmlFor="metros">Metros cuadrados</label>
                <input
                  id="metros"
                  type="number"
                  min="0"
                  step="0.01"
                  value={datos.metros_cuadrados}
                  onChange={(e) => cambiar('metros_cuadrados', e.target.value)}
                  placeholder="Ej. 85"
                />
              </div>
              <div className="campo">
                <label htmlFor="habitaciones">Habitaciones</label>
                <input
                  id="habitaciones"
                  type="number"
                  min="0"
                  step="1"
                  value={datos.habitaciones}
                  onChange={(e) => cambiar('habitaciones', e.target.value)}
                  placeholder="Ej. 3"
                />
              </div>
            </div>
            <div className="campo">
              <label htmlFor="notas">Notas</label>
              <textarea
                id="notas"
                rows="3"
                value={datos.notas}
                onChange={(e) => cambiar('notas', e.target.value)}
                placeholder="Detalles adicionales"
              />
            </div>

            <div className="formulario-acciones">
              <button type="submit" disabled={guardando}>
                {guardando ? 'Guardando…' : 'Guardar'}
              </button>
              {!esNuevo && (
                <button
                  type="button"
                  className="secundario peligro"
                  onClick={borrar}
                  disabled={borrando}
                >
                  {borrando ? 'Comprobando…' : 'Borrar piso'}
                </button>
              )}
            </div>
          </form>
        )}
      </main>
    </>
  )
}
