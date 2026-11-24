import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const apiTarget = process.env.API_URL ?? 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: { '/api': { target: apiTarget, changeOrigin: true } },
  },
  preview: { proxy: { '/api': { target: apiTarget, changeOrigin: true } } },
  test: { environment: 'jsdom', globals: true, setupFiles: './src/test-setup.ts' },
})
