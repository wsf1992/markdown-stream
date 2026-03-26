import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@markdown-stream/core': resolve(__dirname, '../core/src/index.ts'),
      '@markdown-stream/vue3': resolve(__dirname, '../vue3/src/index.ts'),
    },
  },
})
