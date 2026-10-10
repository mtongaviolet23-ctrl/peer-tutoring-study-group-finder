
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    define: {
      'import.meta.env.API_BASE_URL': JSON.stringify(
        env.API_BASE_URL || 'https://peer-tutoring-study-group-finder.onrender.com/api'
      )
    },
    server: {
      port: 5173,
      host: '0.0.0.0'
    }
  }
})
