import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiProxyTarget = (
    env.VITE_HAVNAI_PROXY_TARGET ||
    'http://127.0.0.1:5001'
  ).replace(/\/+$/, '')

  const apiProxy = {
    target: apiProxyTarget,
    changeOrigin: true,
    secure: apiProxyTarget.startsWith('https://'),
  }

  return {
    base: process.env.VERCEL ? '/' : './',
    plugins: [react()],
    server: {
      proxy: {
        '/api': apiProxy,
      },
    },
    preview: {
      proxy: {
        '/api': apiProxy,
      },
    },
  }
})
