import { useState } from 'react'
import { supabase, configurado } from '../lib/supabase.js'

export default function Acceso() {
  const [email, setEmail] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function entrar() {
    setError('')
    setEnviando(true)
    const { error: err } = await supabase.auth.signInWithPassword({
      email,
      password: clave,
    })
    setEnviando(false)
    if (err) {
      setError(
        err.message === 'Invalid login credentials'
          ? 'Email o contraseña incorrectos.'
          : 'No se pudo iniciar sesión. Inténtalo de nuevo.'
      )
    }
  }

  return (
    <div className="acceso">
      <div className="acceso-caja">
        <div className="marca">
          <div className="marca-pino" aria-hidden="true">🌲</div>
          <div className="marca-nombre">
            Inmobiliaria del Pino
            <small>Gestión de alquileres</small>
          </div>
        </div>

        {!configurado ? (
          <div className="aviso-config">
            La aplicación está desplegada, pero falta conectar la base de
            datos. Añade las variables <code>VITE_SUPABASE_URL</code> y{' '}
            <code>VITE_SUPABASE_ANON_KEY</code> en GitHub y vuelve a desplegar.
          </div>
        ) : (
          <>
            {error && <div className="aviso-error">{error}</div>}
            <div className="campo">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="campo">
              <label htmlFor="clave">Contraseña</label>
              <input
                id="clave"
                type="password"
                autoComplete="current-password"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && entrar()}
              />
            </div>
            <button
              style={{ width: '100%' }}
              onClick={entrar}
              disabled={enviando || !email || !clave}
            >
              {enviando ? 'Entrando…' : 'Entrar'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
