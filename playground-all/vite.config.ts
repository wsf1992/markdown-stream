import { defineConfig } from 'vite'
import vue3Plugin from '@vitejs/plugin-vue'
import vue2Plugin from '@vitejs/plugin-vue2'
import reactPlugin from '@vitejs/plugin-react'
import { resolve } from 'path'
import { createRequire } from 'module'
import type { Plugin } from 'vite'

// Load the Vue 2.7 SFC compiler from the `vue2` npm alias so that plugin-vue2
// doesn't accidentally pick up Vue 3's `vue/compiler-sfc`.
const _require = createRequire(import.meta.url)
const vue2CompilerSfc = _require('vue2/compiler-sfc')

/**
 * Redirect `import 'vue'` → `vue2` package for any file whose resolved path
 * contains a `/vue2/` segment (playground source AND the vue2 library source).
 * This allows Vue 2 and Vue 3 to coexist in the same Vite project.
 */
function vue2VueAlias(): Plugin {
  return {
    name: 'vue2-vue-alias',
    enforce: 'pre',
    async resolveId(source, importer) {
      if (source === 'vue' && importer && /[\\/]vue2[\\/]/.test(importer)) {
        const resolved = await this.resolve('vue2', importer, { skipSelf: true })
        return resolved
      }
    },
  }
}

export default defineConfig({
  plugins: [
    vue2VueAlias(),
    // vue3Plugin: covers playground src/vue3/ AND the vue3 library source
    vue3Plugin({ include: [/[\\/]src[\\/]vue3[\\/].*\.vue$/, /[\\/]vue3[\\/]src[\\/].*\.vue$/] }),
    // vue2Plugin: pass the Vue 2 SFC compiler explicitly so it doesn't fall back
    // to `vue/compiler-sfc` (which resolves to Vue 3's compiler in this project).
    vue2Plugin({
      compiler: vue2CompilerSfc,
      include: [/[\\/]src[\\/]vue2[\\/].*\.vue$/, /[\\/]vue2[\\/]src[\\/].*\.vue$/],
    }),
    reactPlugin(),
  ],
  resolve: {
    alias: {
      '@markdown-stream/core': resolve(__dirname, '../core/src/index.ts'),
      '@markdown-stream/vue3': resolve(__dirname, '../vue3/src'),
      '@markdown-stream/react': resolve(__dirname, '../react/src/index.ts'),
      '@markdown-stream/vue2': resolve(__dirname, '../vue2/src'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main:  resolve(__dirname, 'index.html'),
        vue3:  resolve(__dirname, 'vue3.html'),
        react: resolve(__dirname, 'react.html'),
        vue2:  resolve(__dirname, 'vue2.html'),
      },
    },
  },
})
