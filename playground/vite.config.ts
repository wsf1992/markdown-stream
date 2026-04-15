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
 * Redirect `import 'vue'` → a virtual proxy module (re-exports vue2) for any
 * file whose resolved path contains a `/vue2/` segment.
 *
 * Using a virtual module instead of returning the resolved vue2 path directly
 * prevents Vite's dep optimizer from conflating the `vue` pre-bundled chunk
 * with the `vue2` package — which would otherwise cause the `vue.js` chunk to
 * contain Vue 2.7 and break Vue 3 exports like `Fragment`.
 */
const VUE2_PROXY_ID = '\0vue2-proxy'

function vue2VueAlias(): Plugin {
  return {
    name: 'vue2-vue-alias',
    enforce: 'pre',
    resolveId(source, importer) {
      if (source === 'vue' && importer && /[\\/]vue2[\\/]/.test(importer)) {
        return VUE2_PROXY_ID
      }
      if (source === VUE2_PROXY_ID) {
        return VUE2_PROXY_ID
      }
    },
    load(id) {
      if (id === VUE2_PROXY_ID) {
        // Re-export everything from the vue2 package (Vue 2.7).
        // This is evaluated outside any `/vue2/` importer path, so the plugin
        // won't recurse back into itself for the `vue2` specifier.
        return `export * from 'vue2'\nexport { default } from 'vue2'`
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
  optimizeDeps: {
    // `vue2` is `npm:vue@^2.7.0` — an npm alias whose package.json still has
    // `"name": "vue"`. Vite's dep optimizer uses that internal name to construct
    // chunk paths, ending up with the non-existent `vue/dist/vue.runtime.esm.js`.
    // Excluding it skips pre-bundling entirely; Vue 2.7 ships a native ESM
    // build (`dist/vue.runtime.esm.js`) so Vite can serve it as-is.
    exclude: ['vue2'],
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
