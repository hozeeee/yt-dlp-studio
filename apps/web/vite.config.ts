import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  server: {
    host: '::',
    port: 8585,
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:8686',
    },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
})
