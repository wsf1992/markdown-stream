import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@markdown-stream/core': resolve(__dirname, '../core/src/index.ts'),
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
  },
})
