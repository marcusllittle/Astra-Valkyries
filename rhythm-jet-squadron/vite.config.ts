import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiProxyTarget = (
    env.VITE_HAVNAI_PROXY_TARGET ||
    'http://127.0.0.1:5001'
  ).replace(/\/+$/, '')

  // The coordinator serves its routes at the root (/astra/stats, /credits/balance),
  // while the client always calls them under /api. In production the edge in front
  // of joinhavn.io strips that prefix; locally nothing does, so every HavnAI call
  // 404s unless we strip it here too. Set VITE_HAVNAI_PROXY_KEEP_PREFIX=1 when the
  // target is a gateway that expects /api to survive.
  const keepApiPrefix = env.VITE_HAVNAI_PROXY_KEEP_PREFIX === '1'

  const apiProxy = {
    target: apiProxyTarget,
    changeOrigin: true,
    secure: apiProxyTarget.startsWith('https://'),
    ...(keepApiPrefix ? {} : { rewrite: (path: string) => path.replace(/^\/api/, '') }),
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
