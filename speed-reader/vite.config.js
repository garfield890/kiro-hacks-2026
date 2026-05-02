import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

// Vite plugin: after each build, stamp the SW cache name with the build hash
// so old caches are automatically invalidated on deploy.
function stampServiceWorker() {
  return {
    name: 'stamp-sw',
    closeBundle() {
      const swPath = resolve(__dirname, 'dist/sw.js')
      try {
        let sw = readFileSync(swPath, 'utf8')
        const stamp = Date.now().toString(36)
        sw = sw.replace(/speedreader-v1/, `speedreader-${stamp}`)
        writeFileSync(swPath, sw)
      } catch (_) {
        // sw.js not in dist yet (dev mode) — ignore
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), stampServiceWorker()],
  optimizeDeps: {
    // pdfjs-dist ships its own worker; exclude it from pre-bundling
    exclude: ['pdfjs-dist'],
  },
  worker: {
    format: 'es',
  },
})
