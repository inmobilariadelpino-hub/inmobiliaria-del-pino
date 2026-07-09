import { useState } from 'react'
import { supabase, configurado } from '../lib/supabase.js'

export default function Acceso({ aviso }) {
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  async function entrarConGoogle() {
    setError('')
    setEnviando(true)
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: { prompt: 'select_account' },
      },
    })
    if (err) {
      setEnviando(false)
      setError('No se pudo iniciar sesión con Google. Inténtalo de nuevo.')
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
            {aviso && <div className="aviso-error">{aviso}</div>}
            {error && <div className="aviso-error">{error}</div>}
            <p className="acceso-texto">
              Acceso restringido a personas autorizadas.
            </p>
            <button
              className="boton-google"
              onClick={entrarConGoogle}
              disabled={enviando}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.17-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.92c1.71-1.57 2.68-3.88 2.68-6.61z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"/>
                <path fill="#FBBC05" d="M3.97 10.71a5.41 5.41 0 0 1 0-3.42V4.96H.96a9 9 0 0 0 0 8.08l3.01-2.33z"/>
                <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/>
              </svg>
              {enviando ? 'Redirigiendo…' : 'Entrar con Google'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
