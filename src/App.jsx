import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase, configurado } from './lib/supabase.js'
import Acceso from './pages/Acceso.jsx'
import Panel from './pages/Panel.jsx'
import Administradores from './pages/Administradores.jsx'
import Pisos from './pages/Pisos.jsx'
import PisoDetalle from './pages/PisoDetalle.jsx'
import SubirContrato from './pages/SubirContrato.jsx'

export default function App() {
  const [sesion, setSesion] = useState(null)
  const [autorizado, setAutorizado] = useState(false)
  const [aviso, setAviso] = useState('')
  const [cargando, setCargando] = useState(configurado)

  useEffect(() => {
    if (!configurado) return
    supabase.auth.getSession().then(({ data }) => {
      procesarSesion(data.session)
    })
    const { data: escucha } = supabase.auth.onAuthStateChange((_evento, nuevaSesion) => {
      procesarSesion(nuevaSesion)
    })
    return () => escucha.subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function procesarSesion(nuevaSesion) {
    if (!nuevaSesion) {
      setSesion(null)
      setAutorizado(false)
      setCargando(false)
      return
    }
    // Con RLS, si el email no está en administradores, esta consulta
    // devuelve 0 filas. No hace falta comprobar el email directamente.
    const { data, error } = await supabase
      .from('administradores')
      .select('id')
      .eq('email', nuevaSesion.user.email)
      .eq('activo', true)
      .maybeSingle()

    if (error || !data) {
      await supabase.auth.signOut()
      setSesion(null)
      setAutorizado(false)
      setAviso(
        `La cuenta ${nuevaSesion.user.email} no tiene acceso a esta aplicación.`
      )
      setCargando(false)
      return
    }

    setSesion(nuevaSesion)
    setAutorizado(true)
    setAviso('')
    setCargando(false)
  }

  if (cargando) return null

  const dentro = sesion && autorizado

  return (
    <Routes>
      <Route
        path="/acceso"
        element={dentro ? <Navigate to="/" replace /> : <Acceso aviso={aviso} />}
      />
      <Route
        path="/administradores"
        element={dentro ? <Administradores sesion={sesion} /> : <Navigate to="/acceso" replace />}
      />
      <Route
        path="/pisos"
        element={dentro ? <Pisos /> : <Navigate to="/acceso" replace />}
      />
      <Route
        path="/pisos/:id"
        element={dentro ? <PisoDetalle /> : <Navigate to="/acceso" replace />}
      />
      <Route
        path="/subir/contrato"
        element={dentro ? <SubirContrato /> : <Navigate to="/acceso" replace />}
      />
      <Route
        path="/*"
        element={dentro ? <Panel sesion={sesion} /> : <Navigate to="/acceso" replace />}
      />
    </Routes>
  )
}
