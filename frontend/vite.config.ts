import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode`. Also include OS environment variables.
  const env = { ...process.env, ...loadEnv(mode, '../', '') };

  return {
    plugins: [react()],
    envDir: '../',
    // We want to expose GEMINI_API_KEY and others starting with VITE_ or GEMINI_
    envPrefix: ['VITE_', 'GEMINI_'],
    define: {
      // Ensure variables are hard-coded into the bundle during build
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || ''),
      'import.meta.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || ''),
      // Compatibility for legacy process.env checks
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || '')
    },
    resolve: {
      alias: {
        '@': '/src',
      },
    },
    server: {
      port: 3000,
      open: true,
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
      }
    },
  }
})
