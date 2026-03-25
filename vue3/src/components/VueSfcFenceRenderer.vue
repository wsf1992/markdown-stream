<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import type { StatefulToken } from '@markdown-stream/core'

const props = defineProps<{ token: StatefulToken }>()

const iframeRef = ref<HTMLIFrameElement | null>(null)
const blobUrl = ref('')
const containerHeight = ref(200)

const sfcCode = computed(() => props.token.content ?? '')

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
</script>

<template>
  <iframe
    v-if="blobUrl"
    ref="iframeRef"
    :src="blobUrl"
    class="ms-sfc-iframe"
    :style="{ height: containerHeight + 'px' }"
    sandbox="allow-scripts allow-same-origin allow-modals allow-popups allow-forms"
  ></iframe>
</template>

<style scoped>
.ms-sfc-iframe {
  width: 100%;
  border: none;
  display: block;
}
</style>
