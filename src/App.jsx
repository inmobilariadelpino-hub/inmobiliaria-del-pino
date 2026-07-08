import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase, configurado } from './lib/supabase.js'
import Acceso from './pages/Acceso.jsx'
import Panel from './pages/Panel.jsx'

export default function App() {
  const [sesion, setSesion] = useState(null)
  const [cargando, setCargando] = useState(configurado)

  useEffect(() => {
    if (!configurado) return
    supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session)
      setCargando(false)
    })
    const { data: escucha } = supabase.auth.onAuthStateChange((_evento, nuevaSesion) => {
      setSesion(nuevaSesion)
    })
    return () => escucha.subscription.unsubscribe()
  }, [])

  if (cargando) return null

  return (
    <Routes>
      <Route
        path="/acceso"
        element={sesion ? <Navigate to="/" replace /> : <Acceso />}
      />
      <Route
        path="/*"
        element={sesion ? <Panel sesion={sesion} /> : <Navigate to="/acceso" replace />}
      />
    </Routes>
  )
}
