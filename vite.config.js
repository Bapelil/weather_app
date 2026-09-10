import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// For GitHub Pages at https://<user>.github.io/glass-weather/ set
// base to '/glass-weather/'. For Vercel/Netlify leave it as '/'.
export default defineConfig({
  plugins: [react()],
  base: '/',
})
