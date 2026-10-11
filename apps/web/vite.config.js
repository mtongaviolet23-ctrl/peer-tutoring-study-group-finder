
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_API_BASE_URL': JSON.stringify(
      'https://peer-tutoring-study-group-finder.onrender.com/api'
    )
  },
  server: {
    port: 5173,
    host: '0.0.0.0'
  }
})
