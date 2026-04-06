<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, shallowRef, watch } from 'vue'
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
  /** 解析、Shadow DOM 构建、运行时等所有错误统一经此回调抛出 */
  onError?: (err: Error) => void
  /** @deprecated 请使用 onError */
  errorHandler?: (err: Error) => void
}>(), {
  title: '组件预览',
})

const emit = defineEmits<{
  (e: 'render-success', payload: VueSfcRenderSuccessPayload): void
}>()

const containerRef = ref<HTMLDivElement | null>(null)
const renderStartTime = ref<number | null>(null)
const internalRenderTime = ref<number | null>(null)
const copied = ref(false)
let copyResetTimer: number | null = null

// Shadow DOM state
const shadowRoot = shallowRef<ShadowRoot | null>(null)
const vueApp = shallowRef<any>(null)
const headObserver = shallowRef<MutationObserver | null>(null)
let tailwindSentinel: HTMLElement | null = null

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
  source: 'parse' | 'shadow-build' | 'shadow-runtime',
  err: unknown,
): void {
  const e = err instanceof Error ? err : new Error(String(err))
  const names: Record<typeof source, string> = {
    parse: 'VueSfcParseError',
    'shadow-build': 'VueSfcShadowBuildError',
    'shadow-runtime': 'VueSfcShadowRuntimeError',
  }
  e.name = names[source]
  const cb = props.onError ?? props.errorHandler
  if (cb) cb(e)
  else console.error('[VueSfcShadowRenderer]', e)
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
    console.error('[VueSfcShadowRenderer] copy failed', err)
  }
}

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
  // 先清除旧的镜像，再全量克隆当前 head 中所有 style
  sr.querySelectorAll('[data-shadow-mirror]').forEach((n) => n.remove())
  document.head.querySelectorAll('style').forEach((style) => {
    const clone = style.cloneNode(true) as HTMLStyleElement
    clone.setAttribute('data-shadow-mirror', '')
    sr.appendChild(clone)
  })
}

function watchHeadStyles(sr: ShadowRoot): MutationObserver {
  const observer = new MutationObserver(() => {
    // Tailwind v4 会原地更新已有 <style> 的 textContent（characterData 变化），
    // 而非添加新节点，所以需要 subtree + characterData 才能捕获，
    // 每次变化都全量重同步。
    syncHeadStyles(sr)
  })
  observer.observe(document.head, { childList: true, subtree: true, characterData: true })
  return observer
}

function teardownApp() {
  vueApp.value?.unmount()
  vueApp.value = null
  headObserver.value?.disconnect()
  headObserver.value = null
  tailwindSentinel?.remove()
  tailwindSentinel = null
}

/**
 * 将 Shadow DOM 内挂载元素的所有 class 透传到主文档的隐藏哨兵元素，
 * 让 @tailwindcss/browser 能扫描到这些 class 并生成对应 CSS，
 * 再由 watchHeadStyles 把生成的 <style> 镜像回 Shadow Root。
 */
function syncTailwindClasses(mountPoint: HTMLElement) {
  const classes = new Set<string>()
  mountPoint.querySelectorAll('[class]').forEach((el) => {
    el.classList.forEach((c) => classes.add(c))
  })
  if (!classes.size) return

  if (!tailwindSentinel) {
    tailwindSentinel = document.createElement('div')
    tailwindSentinel.setAttribute('aria-hidden', 'true')
    tailwindSentinel.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;'
    document.body.appendChild(tailwindSentinel)
  }
  tailwindSentinel.className = [...classes].join(' ')
  ;(window as any).tailwind?.scan?.()
}

function clearShadowRoot(sr: ShadowRoot) {
  while (sr.firstChild) sr.removeChild(sr.firstChild)
}

async function render() {
  const container = containerRef.value
  if (!container || !sfcCode.value.trim()) return

  teardownApp()

  // Get or create shadow root (attachShadow can only be called once per element)
  let sr = shadowRoot.value
  if (!sr) {
    sr = container.attachShadow({ mode: 'open' })
    shadowRoot.value = sr
  } else {
    clearShadowRoot(sr)
  }

  renderStartTime.value = performance.now()

  try {
    await ensureScripts()

    const win = window as any
    const Vue = win.Vue
    const { loadModule } = win['vue3-sfc-loader']

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
        sr!.appendChild(s)
      },
    }

    const App = await loadModule('/comp.vue', sfcOptions)
    const app = Vue.createApp(App)
    app.config.errorHandler = (err: Error) => {
      emitError('shadow-runtime', err)
    }
    app.mount(mountPoint)
    vueApp.value = app

    // Measure render time after layout settles, then sync Tailwind classes
    requestAnimationFrame(() => {
      const renderTime = renderStartTime.value != null
        ? performance.now() - renderStartTime.value
        : null
      renderStartTime.value = null
      if (typeof renderTime === 'number' && Number.isFinite(renderTime)) {
        internalRenderTime.value = renderTime
        emit('render-success', { renderTime })
      }
      syncTailwindClasses(mountPoint)
    })
  } catch (e: any) {
    renderStartTime.value = null
    emitError('shadow-build', e)
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
      teardownApp()
      return
    }
    render()
  },
)

onMounted(() => {
  if (sfcCode.value.trim() && !sfcParseErrors.value.length) {
    render()
  }
})

onUnmounted(() => {
  teardownApp()
  clearCopyTimer()
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
      <div v-else-if="!sfcCode.trim()" class="ms-sfc-empty">
        暂无可渲染内容
      </div>
      <!--
        containerRef 始终保留在 DOM 中（即使被上方条件覆盖时也用 display:none 隐藏），
        以避免 shadow root 被销毁后需要重新 attachShadow。
      -->
      <div
        ref="containerRef"
        class="ms-sfc-shadow-host"
        :style="(sfcParseErrors.length > 0 || !sfcCode.trim()) ? { display: 'none' } : {}"
      ></div>
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

.ms-sfc-shadow-host {
  display: block;
  width: 100%;
}
</style>
