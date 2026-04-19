import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget =
    env.VITE_DEV_PROXY_TARGET && String(env.VITE_DEV_PROXY_TARGET).trim() !== ''
      ? String(env.VITE_DEV_PROXY_TARGET).trim()
      : mode === 'development'
        ? 'http://localhost:5000'
        : ''
  const proxy =
    proxyTarget
      ? {
          '/api': {
            target: proxyTarget,
            changeOrigin: true,
          },
        }
      : undefined

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy,
    },
  }
})
