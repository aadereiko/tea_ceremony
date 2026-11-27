import { readFileSync } from 'node:fs'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const apiTarget = process.env.API_URL ?? 'http://localhost:8000'
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

export default defineConfig({
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify(version) },
  server: {
    port: 5190,
    strictPort: true,
    proxy: { '/api': { target: apiTarget, changeOrigin: true } },
  },
  preview: { proxy: { '/api': { target: apiTarget, changeOrigin: true } } },
  test: { environment: 'jsdom', globals: true, setupFiles: './src/test-setup.ts' },
})
