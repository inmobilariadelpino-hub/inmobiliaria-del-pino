import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base '/' porque la web se sirve desde el dominio propio (inmobiliariadelpino.es)
export default defineConfig({
  plugins: [react()],
  base: '/',
})
