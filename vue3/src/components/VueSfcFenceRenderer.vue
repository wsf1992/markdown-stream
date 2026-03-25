<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import type { StatefulToken } from '@markdown-stream/core'

const props = defineProps<{ token: StatefulToken }>()

const iframeRef = ref<HTMLIFrameElement | null>(null)
const blobUrl = ref('')
const containerHeight = ref(200)
const activeTab = ref<'preview' | 'code'>('preview')
const copied = ref(false)

const sfcCode = computed(() => props.token.content ?? '')
const lang = computed(() => (props.token.meta?.info as string | undefined) ?? '')

function buildHtml(code: string): string {
  const encoded = btoa(unescape(encodeURIComponent(code)))
  const SC = '<' + '/script>'
  return (
    '<!DOCTYPE html>\n<html>\n<head>\n'
    + '  <meta charset="UTF-8">\n'
    + '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
    + '  <script src="https://cdn.tailwindcss.com">' + SC + '\n'
    + '  <script src="https://unpkg.com/vue@3/dist/vue.global.prod.js">' + SC + '\n'
    + '  <script src="https://cdn.jsdelivr.net/npm/vue3-sfc-loader/dist/vue3-sfc-loader.js">' + SC + '\n'
    + '</head>\n<body>\n'
    + '  <div id="app"></div>\n'
    + '  <script>\n'
    + "    var sfcCode = decodeURIComponent(escape(atob('" + encoded + "')));\n"
    + '    var loadModule = window["vue3-sfc-loader"].loadModule;\n'
    + '    var options = {\n'
    + '      moduleCache: { vue: Vue },\n'
    + '      async getFile(url) {\n'
    + '        if (url === "/comp.vue") return sfcCode;\n'
    + '        if (url.startsWith("http://") || url.startsWith("https://")) {\n'
    + '          var r = await fetch(url);\n'
    + '          if (!r.ok) throw new Error("Failed to fetch: " + url);\n'
    + '          return await r.text();\n'
    + '        }\n'
    + '        throw new Error("Module not found: " + url);\n'
    + '      },\n'
    + '      addStyle(textContent) {\n'
    + '        var s = document.createElement("style");\n'
    + '        s.textContent = textContent;\n'
    + '        document.head.appendChild(s);\n'
    + '      },\n'
    + '    };\n'
    + '    async function loadApp() {\n'
    + '      try {\n'
    + '        var App = await loadModule("/comp.vue", options);\n'
    + '        var app = Vue.createApp(App);\n'
    + '        app.config.errorHandler = function(err) {\n'
    + '          document.body.innerHTML += \'<div style="color:red;padding:10px;background:#fee;font-family:monospace;white-space:pre-wrap;">Error: \' + err.message + "</div>";\n'
    + '        };\n'
    + '        app.mount("#app");\n'
    + '      } catch(e) {\n'
    + '        document.body.innerHTML = \'<div style="color:red;padding:20px;font-family:monospace;"><strong>Load error</strong><pre>\' + e.message + "</pre></div>";\n'
    + '      }\n'
    + '    }\n'
    + '    loadApp();\n'
    + '    new MutationObserver(function() {\n'
    + '      window.parent.postMessage({ type: "sfc-iframe-height", height: Math.max(document.body.scrollHeight, 60) + 20 }, "*");\n'
    + '    }).observe(document.body, { childList: true, subtree: true, attributes: true });\n'
    + '    window.addEventListener("load", function() {\n'
    + '      setTimeout(function() {\n'
    + '        window.parent.postMessage({ type: "sfc-iframe-height", height: Math.max(document.body.scrollHeight, 60) + 20 }, "*");\n'
    + '      }, 300);\n'
    + '    });\n'
    + '  ' + SC + '\n'
    + '</body>\n</html>'
  )
}

function renderIframe() {
  if (blobUrl.value) {
    URL.revokeObjectURL(blobUrl.value)
  }
  const blob = new Blob([buildHtml(sfcCode.value)], { type: 'text/html' })
  blobUrl.value = URL.createObjectURL(blob)
}

function handleMessage(event: MessageEvent) {
  if (event.data?.type === 'sfc-iframe-height') {
    containerHeight.value = Math.max(event.data.height as number, 60)
  }
}

onMounted(() => {
  if (sfcCode.value) {
    renderIframe()
    window.addEventListener('message', handleMessage)
  }
})

onUnmounted(() => {
  window.removeEventListener('message', handleMessage)
  if (blobUrl.value) URL.revokeObjectURL(blobUrl.value)
})

async function copyCode() {
  try {
    await navigator.clipboard.writeText(sfcCode.value)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = sfcCode.value
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  }
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}
</script>

<template>
  <!-- Not a vue fence: fall back to plain code block -->
  <pre v-if="lang !== 'vue'" :data-state="token.state" class="ms-token-fence"><code :class="lang ? `language-${lang}` : undefined">{{ sfcCode }}</code></pre>

  <!-- Vue SFC fence -->
  <div v-else class="ms-sfc-fence" :data-state="token.state">
    <!-- Tab bar -->
    <div class="ms-sfc-tabs">
      <button
        :class="['ms-sfc-tab', activeTab === 'preview' ? 'ms-sfc-tab--active' : '']"
        @click="activeTab = 'preview'"
      >Preview</button>
      <button
        :class="['ms-sfc-tab', activeTab === 'code' ? 'ms-sfc-tab--active' : '']"
        @click="activeTab = 'code'"
      >Code</button>
      <button class="ms-sfc-copy" :title="copied ? 'Copied!' : 'Copy code'" @click="copyCode">
        <svg v-if="!copied" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </button>
    </div>

    <!-- Live preview iframe -->
    <iframe
      v-if="activeTab === 'preview' && blobUrl"
      ref="iframeRef"
      :src="blobUrl"
      class="ms-sfc-iframe"
      :style="{ height: containerHeight + 'px' }"
      sandbox="allow-scripts allow-same-origin allow-modals allow-popups allow-forms"
    ></iframe>

    <!-- Code view -->
    <pre v-else class="ms-sfc-code"><code class="language-vue">{{ sfcCode }}</code></pre>
  </div>
</template>

<style scoped>
.ms-sfc-fence {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  margin: 1rem 0;
}

.ms-sfc-tabs {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 6px 8px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.ms-sfc-tab {
  padding: 3px 12px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.ms-sfc-tab:hover {
  background: #e5e7eb;
  color: #111827;
}

.ms-sfc-tab--active {
  background: #ffffff;
  color: #111827;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.ms-sfc-copy {
  margin-left: auto;
  padding: 4px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #9ca3af;
  display: flex;
  align-items: center;
  border-radius: 4px;
  transition: background 0.15s, color 0.15s;
}

.ms-sfc-copy:hover {
  background: #e5e7eb;
  color: #374151;
}

.ms-sfc-iframe {
  width: 100%;
  border: none;
  display: block;
}

.ms-sfc-code {
  margin: 0;
  padding: 16px;
  overflow-x: auto;
  background: #1e1e1e;
  color: #d4d4d4;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  line-height: 1.6;
}

.ms-sfc-code code {
  background: none;
  padding: 0;
  font-size: inherit;
  color: inherit;
}
</style>
