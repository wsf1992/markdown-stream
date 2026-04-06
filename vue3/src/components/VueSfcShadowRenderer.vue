<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, shallowRef } from 'vue'
import type { StatefulToken } from '@markdown-stream/core'
import vueGlobalScript from 'vue/dist/vue.global.prod.js?raw'
import sfcLoaderScript from 'vue3-sfc-loader/dist/vue3-sfc-loader.js?raw'
import tailwindScript from '@tailwindcss/browser?raw'

const props = defineProps<{ token: StatefulToken }>()

const containerRef = ref<HTMLDivElement | null>(null)
const errorMsg = ref('')
const vueApp = shallowRef<any>(null)
const headObserver = shallowRef<MutationObserver | null>(null)

const sfcCode = computed(() => props.token.content ?? '')

// --- Script injection (singleton per page) ---

let scriptsReady: Promise<void> | null = null

function ensureScripts(): Promise<void> {
  if (scriptsReady) return scriptsReady
  scriptsReady = new Promise<void>((resolve) => {
    const win = window as any
    if (!win.Vue) {
      const s = document.createElement('script')
      s.textContent = vueGlobalScript
      document.head.appendChild(s)
    }
    if (!win['vue3-sfc-loader']) {
      const s = document.createElement('script')
      s.textContent = sfcLoaderScript
      document.head.appendChild(s)
    }
    if (!win.__tailwindBrowserLoaded) {
      const s = document.createElement('script')
      s.textContent = tailwindScript
      document.head.appendChild(s)
      win.__tailwindBrowserLoaded = true
    }
    resolve()
  })
  return scriptsReady
}

// --- Mirror <style> tags from document.head into shadow root (for Tailwind) ---

function syncHeadStyles(sr: ShadowRoot) {
  document.head.querySelectorAll('style').forEach((style) => {
    const clone = style.cloneNode(true) as HTMLStyleElement
    clone.setAttribute('data-shadow-mirror', '')
    sr.appendChild(clone)
  })
}

function watchHeadStyles(sr: ShadowRoot): MutationObserver {
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach((node) => {
        if (node.nodeName === 'STYLE') {
          const clone = node.cloneNode(true) as HTMLStyleElement
          clone.setAttribute('data-shadow-mirror', '')
          sr.appendChild(clone)
        }
      })
    }
  })
  observer.observe(document.head, { childList: true })
  return observer
}

// --- Main render ---

async function render() {
  const container = containerRef.value
  if (!container || !sfcCode.value) return

  try {
    await ensureScripts()

    const win = window as any
    const Vue = win.Vue
    const { loadModule } = win['vue3-sfc-loader']

    // Attach Shadow DOM
    const sr = container.attachShadow({ mode: 'open' })

    // Prevent host page styles from bleeding in via CSS inheritance
    const baseStyle = document.createElement('style')
    baseStyle.textContent = ':host { all: initial; display: block; }'
    sr.appendChild(baseStyle)

    // Mirror existing Tailwind/global styles and watch for new ones
    syncHeadStyles(sr)
    headObserver.value = watchHeadStyles(sr)

    // Mount point inside shadow root
    const mountPoint = document.createElement('div')
    sr.appendChild(mountPoint)

    const code = sfcCode.value

    const sfcOptions = {
      moduleCache: { vue: Vue },
      async getFile(url: string) {
        if (url === '/comp.vue') return code
        if (url.startsWith('http://') || url.startsWith('https://')) {
          const r = await fetch(url)
          if (!r.ok) throw new Error('Failed to fetch: ' + url)
          return await r.text()
        }
        throw new Error('Module not found: ' + url)
      },
      addStyle(textContent: string) {
        // Component scoped/global styles go directly into shadow root
        const s = document.createElement('style')
        s.textContent = textContent
        sr.appendChild(s)
      },
    }

    const App = await loadModule('/comp.vue', sfcOptions)
    const app = Vue.createApp(App)
    app.config.errorHandler = (err: Error) => {
      errorMsg.value = err.message
    }
    app.mount(mountPoint)
    vueApp.value = app
  } catch (e: any) {
    errorMsg.value = e?.message ?? String(e)
  }
}

onMounted(() => {
  if (sfcCode.value) render()
})

onUnmounted(() => {
  headObserver.value?.disconnect()
  vueApp.value?.unmount()
})
</script>

<template>
  <div ref="containerRef" class="ms-sfc-shadow-host"></div>
  <div v-if="errorMsg" class="ms-sfc-error">
    <strong>Error</strong>
    <pre>{{ errorMsg }}</pre>
  </div>
</template>

<style scoped>
.ms-sfc-shadow-host {
  display: block;
  width: 100%;
}

.ms-sfc-error {
  color: #c0392b;
  background: #fdecea;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  padding: 12px 16px;
  font-family: monospace;
  font-size: 13px;
}

.ms-sfc-error pre {
  margin: 4px 0 0;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
