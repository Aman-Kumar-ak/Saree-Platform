import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = env.VITE_DEV_PROXY_TARGET
  const proxy =
    proxyTarget && String(proxyTarget).trim() !== ''
      ? {
          '/api': {
            target: String(proxyTarget).trim(),
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
