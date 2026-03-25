<script setup>
import { ref, onMounted, watch, onUnmounted } from 'vue'
import { genuiApis } from '../genui-api.js'

const props = defineProps({
  content: {
    type: String,
    required: true
  }
})

const containerHeight = ref(200)
const iframeRef = ref(null)
const currentUrl = ref('')
const copied = ref(false)

async function copyCode() {
  try {
    await navigator.clipboard.writeText(props.content)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    // fallback
    const ta = document.createElement('textarea')
    ta.value = props.content
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  }
}

function buildHtml() {
  const sfcCode = props.content

  // Base64 encode to safely embed SFC code
  const encoded = btoa(unescape(encodeURIComponent(sfcCode)))

  // Pass the origin so iframe can fetch preset components via HTTP
  const baseUrl = window.location.origin

  // Use string concatenation to avoid closing-script-tag literal which breaks Vue SFC parser
  const SC = '<' + '/script>'

  const html = '<!DOCTYPE html>\n<html>\n<head>\n'
    + '  <meta charset="UTF-8">\n'
    + '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
    + '  <script src="https://cdn.tailwindcss.com">' + SC + '\n'
    + '  <script src="https://unpkg.com/vue@3/dist/vue.global.prod.js">' + SC + '\n'
    + '  <script src="https://cdn.jsdelivr.net/npm/vue3-sfc-loader/dist/vue3-sfc-loader.js">' + SC + '\n'
    + '</head>\n<body>\n'
    + '  <div id="app"></div>\n'
    + '  <script>\n'
    + '    var _pending = {};\n'
    + '    window.addEventListener("message", function(e) {\n'
    + '      if (e.data && e.data.type === "genui-response") {\n'
    + '        var p = _pending[e.data.callId];\n'
    + '        if (p) {\n'
    + '          delete _pending[e.data.callId];\n'
    + '          if (e.data.error) p.reject(new Error(e.data.error));\n'
    + '          else p.resolve(e.data.result);\n'
    + '        }\n'
    + '      }\n'
    + '    });\n'
    + '    var _apiNames = ' + JSON.stringify(Object.keys(genuiApis)) + ';\n'
    + '    window.genui = {};\n'
    + '    _apiNames.forEach(function(name) {\n'
    + '      window.genui[name] = function() {\n'
    + '        var args = Array.prototype.slice.call(arguments);\n'
    + '        return new Promise(function(resolve, reject) {\n'
    + '          var callId = Math.random().toString(36).slice(2) + Date.now().toString(36);\n'
    + '          _pending[callId] = { resolve: resolve, reject: reject };\n'
    + '          window.parent.postMessage({ type: "genui-call", callId: callId, method: name, args: args }, "*");\n'
    + '        });\n'
    + '      };\n'
    + '    });\n'
    + "    var sfcCode = decodeURIComponent(escape(atob('" + encoded + "')));\n"
    + "    var baseUrl = '" + baseUrl + "';\n"
    + '    var presetCache = {};\n'
    + '    var loadModule = window["vue3-sfc-loader"].loadModule;\n'
    + '    var options = {\n'
    + '      moduleCache: { vue: Vue },\n'
    + '      async getFile(url) {\n'
    + '        if (url === "/comp.vue") return sfcCode;\n'
    + '        if (url.startsWith("/preset/")) {\n'
    + '          if (presetCache[url]) return presetCache[url];\n'
    + '          var res = await fetch(baseUrl + url);\n'
    + '          if (!res.ok) throw new Error("Preset not found: " + url);\n'
    + '          var text = await res.text();\n'
    + '          presetCache[url] = text;\n'
    + '          return text;\n'
    + '        }\n'
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
    + '          document.body.innerHTML += \'<div style="color:red;padding:10px;background:#fee;">Error: \' + err.message + "</div>";\n'
    + '        };\n'
    + '        app.mount("#app");\n'
    + '      } catch(e) {\n'
    + '        document.body.innerHTML = \'<div style="color:red;padding:20px;"><h3>加载错误</h3><pre>\' + e.message + "</pre></div>";\n'
    + '      }\n'
    + '    }\n'
    + '    loadApp();\n'
    + '    window.addEventListener("load", function() {\n'
    + '      setTimeout(function() {\n'
    + '        window.parent.postMessage({ type: "iframe-height", height: Math.max(document.body.scrollHeight, 100) + 20 }, "*");\n'
    + '      }, 500);\n'
    + '    });\n'
    + '    new MutationObserver(function() {\n'
    + '      window.parent.postMessage({ type: "iframe-height", height: Math.max(document.body.scrollHeight, 100) + 20 }, "*");\n'
    + '    }).observe(document.body, { childList: true, subtree: true });\n'
    + '  ' + SC + '\n'
    + '</body>\n</html>'

  return html
}

function renderSFC() {
  if (!props.content) return
  if (currentUrl.value) {
    URL.revokeObjectURL(currentUrl.value)
  }
  const html = buildHtml()
  const blob = new Blob([html], { type: 'text/html' })
  currentUrl.value = URL.createObjectURL(blob)
}

function handleMessage(event) {
  if (event.data?.type === 'iframe-height') {
    containerHeight.value = Math.max(event.data.height, 100)
  }
  // RPC bridge: iframe calls genui API -> parent executes -> returns result
  if (event.data?.type === 'genui-call') {
    const { callId, method, args } = event.data
    const iframe = iframeRef.value
    if (!iframe) return
    const fn = genuiApis[method]
    if (!fn) {
      iframe.contentWindow.postMessage({ type: 'genui-response', callId, error: 'Unknown API: ' + method }, '*')
      return
    }
    Promise.resolve()
      .then(() => fn(...args))
      .then(result => {
        iframe.contentWindow.postMessage({ type: 'genui-response', callId, result }, '*')
      })
      .catch(err => {
        iframe.contentWindow.postMessage({ type: 'genui-response', callId, error: err.message }, '*')
      })
  }
}

onMounted(() => {
  window.addEventListener('message', handleMessage)
  renderSFC()
})

watch(() => props.content, () => {
  renderSFC()
})

onUnmounted(() => {
  window.removeEventListener('message', handleMessage)
  if (currentUrl.value) {
    URL.revokeObjectURL(currentUrl.value)
  }
})
</script>

<template>
  <div class="my-4 rounded-lg overflow-hidden border border-gray-200 relative group">
    <button
      @click="copyCode"
      class="absolute top-2 right-2 z-10 p-1.5 rounded bg-white/80 hover:bg-white border border-gray-200 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
      :title="copied ? '已复制' : '复制代码'"
    >
      <svg v-if="!copied" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
      <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </button>
    <iframe
      ref="iframeRef"
      :src="currentUrl"
      class="w-full border-0"
      :style="{ height: containerHeight + 'px' }"
      sandbox="allow-scripts allow-same-origin allow-modals allow-popups allow-forms"
    ></iframe>
  </div>
</template>
