import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@sudoku': fileURLToPath(new URL('./src/node_modules/@sudoku', import.meta.url)),
    },
  },
})
