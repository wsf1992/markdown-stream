import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@markdown-stream/core': resolve(__dirname, '../core/src/index.ts'),
      '@markdown-stream/react': resolve(__dirname, '../react/src/index.ts'),
    },
  },
})
