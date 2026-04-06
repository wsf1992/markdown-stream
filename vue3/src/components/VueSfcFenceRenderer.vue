<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { parse } from '@vue/compiler-sfc'
import type { StatefulToken } from '@markdown-stream/core'
import vueGlobalScript from 'vue/dist/vue.global.prod.js?raw'
import sfcLoaderScript from 'vue3-sfc-loader/dist/vue3-sfc-loader.js?raw'
import tailwindScript from '@tailwindcss/browser?raw'
import type { VueSfcCardMetrics, VueSfcRenderSuccessPayload } from '../types/sfc-renderer.js'

const props = withDefaults(defineProps<{
  token: StatefulToken
  title?: string
  metrics?: VueSfcCardMetrics
  /** 解析、iframe 构建、iframe 内运行时等所有错误统一经此回调抛出 */
  onError?: (err: Error) => void
  /** @deprecated 请使用 onError */
  errorHandler?: (err: Error) => void
}>(), {
  title: '组件预览',
})

const emit = defineEmits<{
  (e: 'render-success', payload: VueSfcRenderSuccessPayload): void
}>()

const iframeRef = ref<HTMLIFrameElement | null>(null)
const blobUrl = ref('')
const containerHeight = ref(200)
const renderStartTime = ref<number | null>(null)
const internalRenderTime = ref<number | null>(null)
const copied = ref(false)
let copyResetTimer: number | null = null

// 流式指标：elapsed/tps 随 token.content 变化重算，startTime/doneTime 来自 token.meta
const streamElapsed = ref(0)
const streamTps = ref(0)

const sfcCode = computed(() => props.token.content ?? '')
const resolvedRenderTime = computed(() => props.metrics?.renderTime ?? internalRenderTime.value)
const streamTotalChars = computed(() => props.token.content?.length ?? 0)
const toolbarItems = computed(() => {
  const items: string[] = []
  const tps        = props.metrics?.tps        ?? streamTps.value
  const totalChars = props.metrics?.totalChars ?? streamTotalChars.value
  const elapsed    = props.metrics?.elapsed    ?? streamElapsed.value

  if (typeof tps === 'number' && Number.isFinite(tps) && tps > 0)
    items.push(`${tps} 字符/秒`)
  if (typeof totalChars === 'number' && Number.isFinite(totalChars) && totalChars > 0)
    items.push(`${totalChars} 字符`)
  if (typeof elapsed === 'number' && Number.isFinite(elapsed) && elapsed > 0)
    items.push(`生成 ${elapsed.toFixed(1)}s`)
  if (typeof resolvedRenderTime.value === 'number' && Number.isFinite(resolvedRenderTime.value))
    items.push(`渲染 ${resolvedRenderTime.value.toFixed(0)}ms`)

  return items
})

watch(
  () => props.token.id,
  () => {
    streamElapsed.value = 0
    streamTps.value = 0
  }
)

// token.content 每次变化时，从 token.meta 的起止时间重算 elapsed 和 tps
watch(
  () => [props.token.state, props.token.content] as const,
  ([state, content]) => {
    const start = props.token.meta?.streamStartTime as number | undefined
    if (!start) return
    const end = state === 'done'
      ? (props.token.meta?.streamDoneTime as number | undefined) ?? Date.now()
      : Date.now()
    const elapsed = (end - start) / 1000
    const len = content?.length ?? 0
    streamElapsed.value = elapsed
    streamTps.value = elapsed > 0 ? Math.round(len / elapsed) : 0
  },
  { immediate: true }
)

/** 与 vue3-sfc-loader 独立：用官方 SFC 解析器发现结构/模板类错误（未闭合标签等），loader 可能不会抛错。 */
const sfcParseErrors = computed(() => {
  const code = sfcCode.value
  if (!code.trim()) return [] as string[]
  const { errors } = parse(code, { filename: 'fence.vue' })
  if (!errors.length) return []
  const lines = errors.map((e) => {
    const loc = (e as { loc?: { start?: { line: number, column: number } } }).loc
    const at = loc?.start ? ` (${loc.start.line}:${loc.start.column})` : ''
    return e.message + at
  })
  return [...new Set(lines)]
})

function emitError(
  source: 'parse' | 'iframe-build' | 'iframe-runtime',
  err: unknown,
): void {
  const e = err instanceof Error ? err : new Error(String(err))
  const names: Record<typeof source, string> = {
    parse: 'VueSfcParseError',
    'iframe-build': 'VueSfcIframeBuildError',
    'iframe-runtime': 'VueSfcIframeRuntimeError',
  }
  e.name = names[source]
  const cb = props.onError ?? props.errorHandler
  if (cb) cb(e)
  else console.error('[VueSfcFenceRenderer]', e)
}

function clearCopyTimer() {
  if (copyResetTimer !== null) {
    window.clearTimeout(copyResetTimer)
    copyResetTimer = null
  }
}

async function copySource() {
  if (!sfcCode.value.trim()) return

  try {
    await navigator.clipboard.writeText(sfcCode.value)
    copied.value = true
    clearCopyTimer()
    copyResetTimer = window.setTimeout(() => {
      copied.value = false
      copyResetTimer = null
    }, 2000)
  } catch (err) {
    console.error('[VueSfcFenceRenderer] copy failed', err)
  }
}

function buildHtml(code: string): string {
  const encoded = btoa(unescape(encodeURIComponent(code)))
  const SC = '<' + '/script>'
  return (
    '<!DOCTYPE html>\n<html>\n<head>\n'
    + '  <meta charset="UTF-8">\n'
    + '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
    + '  <script>' + tailwindScript + SC + '\n'
    + '  <script>' + vueGlobalScript + SC + '\n'
    + '  <script>' + sfcLoaderScript + SC + '\n'
    + '</head>\n<body>\n'
    + '  <div id="app"></div>\n'
    + '  <script>\n'
    + "    var sfcCode = decodeURIComponent(escape(atob('" + encoded + "')));\n"
    + '    var loadModule = window["vue3-sfc-loader"].loadModule;\n'
    + '    function postHeight() {\n'
    + '      try { window.parent.postMessage({ type: "sfc-iframe-height", height: Math.max(document.body.scrollHeight, 60) + 20 }, "*"); } catch(_) {}\n'
    + '    }\n'
    + '    function postRenderSuccess() {\n'
    + '      try { window.parent.postMessage({ type: "sfc-iframe-render-success" }, "*"); } catch(_) {}\n'
    + '    }\n'
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
    + '          var msg = err && err.message ? err.message : String(err);\n'
    + '          try { window.parent.postMessage({ type: "sfc-iframe-error", message: msg }, "*"); } catch(_) {}\n'
    + '          document.body.innerHTML += \'<div style="color:red;padding:10px;background:#fee;font-family:monospace;white-space:pre-wrap;">Error: \' + msg + "</div>";\n'
    + '        };\n'
    + '        app.mount("#app");\n'
    + '        requestAnimationFrame(function() {\n'
    + '          setTimeout(function() {\n'
    + '            postHeight();\n'
    + '            postRenderSuccess();\n'
    + '          }, 0);\n'
    + '        });\n'
    + '      } catch(e) {\n'
    + '        var loadErr = e && e.message ? e.message : String(e);\n'
    + '        try { window.parent.postMessage({ type: "sfc-iframe-error", message: loadErr }, "*"); } catch(_) {}\n'
    + '        document.body.innerHTML = \'<div style="color:red;padding:20px;font-family:monospace;"><strong>Load error</strong><pre>\' + loadErr + "</pre></div>";\n'
    + '      }\n'
    + '    }\n'
    + '    loadApp();\n'
    + '    new MutationObserver(function() {\n'
    + '      postHeight();\n'
    + '    }).observe(document.body, { childList: true, subtree: true, attributes: true });\n'
    + '    window.addEventListener("load", function() {\n'
    + '      setTimeout(function() {\n'
    + '        postHeight();\n'
    + '      }, 300);\n'
    + '    });\n'
    + '  ' + SC + '\n'
    + '</body>\n</html>'
  )
}

function renderIframe() {
  const oldUrl = blobUrl.value
  renderStartTime.value = performance.now()
  try {
    const blob = new Blob([buildHtml(sfcCode.value)], { type: 'text/html' })
    blobUrl.value = URL.createObjectURL(blob)
  } catch (err) {
    renderStartTime.value = null
    emitError('iframe-build', err)
    blobUrl.value = ''
  }
  if (oldUrl) URL.revokeObjectURL(oldUrl)
}

function isOwnIframeMessage(event: MessageEvent): boolean {
  const win = iframeRef.value?.contentWindow
  return Boolean(win && event.source === win)
}

function handleMessage(event: MessageEvent) {
  if (!isOwnIframeMessage(event)) return

  if (event.data?.type === 'sfc-iframe-height') {
    containerHeight.value = Math.max(Number(event.data.height) || 60, 60)
    return
  }
  if (event.data?.type === 'sfc-iframe-render-success') {
    const nextRenderTime = renderStartTime.value == null
      ? internalRenderTime.value
      : performance.now() - renderStartTime.value

    if (typeof nextRenderTime === 'number' && Number.isFinite(nextRenderTime)) {
      internalRenderTime.value = nextRenderTime
      emit('render-success', { renderTime: nextRenderTime })
    }
    renderStartTime.value = null
    return
  }
  if (event.data?.type === 'sfc-iframe-error') {
    emitError('iframe-runtime', new Error(String(event.data.message ?? '')))
  }
}

watch(
  () => sfcParseErrors.value.join('\n'),
  (sig) => {
    if (sig) emitError('parse', new Error(sig))
  },
  { immediate: true },
)

watch(
  [sfcCode, sfcParseErrors],
  () => {
    if (!sfcCode.value.trim() || sfcParseErrors.value.length > 0) {
      const oldUrl = blobUrl.value
      blobUrl.value = ''
      renderStartTime.value = null
      if (oldUrl) URL.revokeObjectURL(oldUrl)
      return
    }
    renderIframe()
  },
  { immediate: true },
)

onMounted(() => {
  window.addEventListener('message', handleMessage)
})

onUnmounted(() => {
  window.removeEventListener('message', handleMessage)
  clearCopyTimer()
  if (blobUrl.value) URL.revokeObjectURL(blobUrl.value)
})
</script>

<template>
  <div class="ms-sfc-card">
    <div class="ms-sfc-card-header">
      <div class="ms-sfc-card-toolbar">
        <div v-if="toolbarItems.length" class="ms-sfc-card-metrics" aria-label="render metrics">
          <span v-for="item in toolbarItems" :key="item" class="ms-sfc-card-metric">{{ item }}</span>
        </div>
        <button
          type="button"
          class="ms-sfc-card-copy"
          :disabled="!sfcCode.trim()"
          @click="copySource"
        >
          {{ copied ? '已复制' : '复制' }}
        </button>
      </div>
    </div>

    <div class="ms-sfc-card-body">
      <div v-if="sfcParseErrors.length" class="ms-sfc-parse-errors" role="alert">
        <strong class="ms-sfc-parse-errors-title">SFC 解析错误</strong>
        <ul class="ms-sfc-parse-errors-list">
          <li v-for="(msg, i) in sfcParseErrors" :key="i">{{ msg }}</li>
        </ul>
      </div>
      <iframe
        v-else-if="blobUrl"
        ref="iframeRef"
        :src="blobUrl"
        class="ms-sfc-iframe"
        :style="{ height: containerHeight + 'px' }"
        sandbox="allow-scripts allow-same-origin allow-modals allow-popups allow-forms"
      ></iframe>
      <div v-else class="ms-sfc-empty">
        暂无可渲染内容
      </div>
    </div>
  </div>
</template>

<style scoped>
.ms-sfc-card {
  margin: 12px 0;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  overflow: hidden;
  background: #ffffff;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
}

.ms-sfc-card-header {
  padding: 14px 16px 12px;
  border-bottom: 1px solid #eef2f7;
  background:
    linear-gradient(180deg, rgba(248, 250, 252, 0.92), rgba(255, 255, 255, 0.98));
}

.ms-sfc-card-title {
  display: block;
  color: #111827;
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.4;
}

.ms-sfc-card-toolbar {
  margin-top: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.ms-sfc-card-metrics {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  color: #6b7280;
  font-size: 0.8125rem;
  line-height: 1.4;
}

.ms-sfc-card-metric {
  white-space: nowrap;
}

.ms-sfc-card-copy {
  border: 1px solid #dbe3ee;
  border-radius: 999px;
  background: #ffffff;
  color: #374151;
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1;
  padding: 8px 12px;
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;
}

.ms-sfc-card-copy:hover:not(:disabled) {
  border-color: #93c5fd;
  color: #1d4ed8;
  background: #eff6ff;
}

.ms-sfc-card-copy:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ms-sfc-card-body {
  padding: 16px;
  background: #f8fafc;
}

.ms-sfc-parse-errors {
  margin: 0;
  padding: 12px 14px;
  border-radius: 8px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.8125rem;
  line-height: 1.5;
}

.ms-sfc-parse-errors-title {
  display: block;
  margin-bottom: 8px;
  font-size: 0.875rem;
}

.ms-sfc-parse-errors-list {
  margin: 0;
  padding-left: 1.25rem;
}

.ms-sfc-empty {
  padding: 20px 16px;
  border: 1px dashed #d1d5db;
  border-radius: 12px;
  color: #6b7280;
  font-size: 0.875rem;
  text-align: center;
  background: #f8fafc;
}

.ms-sfc-iframe {
  width: 100%;
  border: none;
  display: block;
}
</style>
