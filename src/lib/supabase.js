import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// La app puede desplegarse antes de tener Supabase configurado:
// en ese caso mostramos un aviso en lugar de romper.
export const configurado = Boolean(url && anonKey)

export const supabase = configurado ? createClient(url, anonKey) : null
