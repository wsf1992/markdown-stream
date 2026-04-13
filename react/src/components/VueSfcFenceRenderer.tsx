import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { StatefulToken } from '@markdown-stream/core'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VueSfcCardMetrics {
  tps?: number | null
  totalChars?: number | null
  elapsed?: number | null
  renderTime?: number | null
}

export interface VueSfcRenderSuccessPayload {
  renderTime: number
}

export interface VueSfcFenceRendererProps {
  token: StatefulToken
  title?: string
  metrics?: VueSfcCardMetrics
  /** All errors (iframe-build / iframe-runtime) are surfaced here */
  onError?: (err: Error) => void
  /** @deprecated Use onError instead */
  errorHandler?: (err: Error) => void
  onRenderSuccess?: (payload: VueSfcRenderSuccessPayload) => void
}

// ---------------------------------------------------------------------------
// Iframe HTML builder
// ---------------------------------------------------------------------------

/**
 * Builds a self-contained HTML document that loads Vue + vue3-sfc-loader from
 * CDN and mounts the given SFC code as `#app`.
 *
 * Height-change and error messages are posted back to the parent window via
 * `postMessage` so the parent can resize the iframe and surface runtime errors.
 */
function buildHtml(code: string): string {
  const encoded = btoa(unescape(encodeURIComponent(code)))
  const SC = '<' + '/script>'
  return (
    '<!DOCTYPE html>\n<html>\n<head>\n'
    + '  <meta charset="UTF-8">\n'
    + '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
    + '  <script src="https://cdn.tailwindcss.com">' + SC + '\n'
    + '  <script src="https://unpkg.com/vue@3/dist/vue.global.prod.js">' + SC + '\n'
    + '  <script src="https://unpkg.com/vue3-sfc-loader/dist/vue3-sfc-loader.js">' + SC + '\n'
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
    + '          setTimeout(function() { postHeight(); postRenderSuccess(); }, 0);\n'
    + '        });\n'
    + '      } catch(e) {\n'
    + '        var loadErr = e && e.message ? e.message : String(e);\n'
    + '        try { window.parent.postMessage({ type: "sfc-iframe-error", message: loadErr }, "*"); } catch(_) {}\n'
    + '        document.body.innerHTML = \'<div style="color:red;padding:20px;font-family:monospace;"><strong>Load error</strong><pre>\' + loadErr + "</pre></div>";\n'
    + '      }\n'
    + '    }\n'
    + '    loadApp();\n'
    + '    new MutationObserver(function() { postHeight(); })\n'
    + '      .observe(document.body, { childList: true, subtree: true, attributes: true });\n'
    + '    window.addEventListener("load", function() {\n'
    + '      setTimeout(function() { postHeight(); }, 300);\n'
    + '    });\n'
    + '  ' + SC + '\n'
    + '</body>\n</html>'
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function VueSfcFenceRenderer({
  token,
  metrics,
  onError,
  errorHandler,
  onRenderSuccess,
}: VueSfcFenceRendererProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const [blobUrl, setBlobUrl] = useState('')
  const [containerHeight, setContainerHeight] = useState(200)
  const renderStartTimeRef = useRef<number | null>(null)
  const [internalRenderTime, setInternalRenderTime] = useState<number | null>(null)
  // Mirror internalRenderTime in a ref so the message handler can read it without deps
  const internalRenderTimeRef = useRef<number | null>(null)
  const [copied, setCopied] = useState(false)
  const copyResetTimerRef = useRef<number | null>(null)
  const heightDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Stream metrics — recalculated from token.meta on every content change
  const [streamElapsed, setStreamElapsed] = useState(0)
  const [streamTps, setStreamTps] = useState(0)

  // Keep onRenderSuccess in a ref so the message handler never needs it in deps
  const onRenderSuccessRef = useRef(onRenderSuccess)
  useEffect(() => { onRenderSuccessRef.current = onRenderSuccess }, [onRenderSuccess])

  // Warn once if the deprecated errorHandler prop is used
  useEffect(() => {
    if (errorHandler) {
      console.warn('[VueSfcFenceRenderer] errorHandler is deprecated. Use onError instead.')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const sfcCode = token.content ?? ''

  // Recalculate elapsed / tps whenever state or content changes
  useEffect(() => {
    const start = token.meta?.streamStartTime as number | undefined
    if (!start) return
    const end =
      token.state === 'done'
        ? ((token.meta?.streamDoneTime as number | undefined) ?? Date.now())
        : Date.now()
    const elapsed = (end - start) / 1000
    const len = token.content?.length ?? 0
    setStreamElapsed(elapsed)
    setStreamTps(elapsed > 0 ? Math.round(len / elapsed) : 0)
  }, [token.state, token.content]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset metrics when the token identity changes
  const prevTokenIdRef = useRef(token.id)
  useEffect(() => {
    if (prevTokenIdRef.current !== token.id) {
      prevTokenIdRef.current = token.id
      setStreamElapsed(0)
      setStreamTps(0)
    }
  }, [token.id])

  const resolvedRenderTime = metrics?.renderTime ?? internalRenderTime

  const toolbarItems = useMemo(() => {
    const items: string[] = []
    const tps        = metrics?.tps        ?? streamTps
    const totalChars = metrics?.totalChars ?? (token.content?.length ?? 0)
    const elapsed    = metrics?.elapsed    ?? streamElapsed

    if (typeof tps === 'number' && Number.isFinite(tps) && tps > 0)
      items.push(`${tps} 字符/秒`)
    if (typeof totalChars === 'number' && Number.isFinite(totalChars) && totalChars > 0)
      items.push(`${totalChars} 字符`)
    if (typeof elapsed === 'number' && Number.isFinite(elapsed) && elapsed > 0)
      items.push(`生成 ${elapsed.toFixed(1)}s`)
    if (typeof resolvedRenderTime === 'number' && Number.isFinite(resolvedRenderTime))
      items.push(`渲染 ${resolvedRenderTime.toFixed(0)}ms`)

    return items
  }, [metrics, streamTps, streamElapsed, token.content, resolvedRenderTime])

  // ------------------------------------------------------------------
  // Error helper — stored in a ref so it never destabilises downstream effects
  // ------------------------------------------------------------------

  const emitError = useCallback(
    (source: 'iframe-build' | 'iframe-runtime', err: unknown) => {
      const e = err instanceof Error ? err : new Error(String(err))
      const names = {
        'iframe-build': 'VueSfcIframeBuildError',
        'iframe-runtime': 'VueSfcIframeRuntimeError',
      } as const
      e.name = names[source]
      const cb = onError ?? errorHandler
      if (cb) cb(e)
      else console.error('[VueSfcFenceRenderer]', e)
    },
    [onError, errorHandler],
  )

  const emitErrorRef = useRef(emitError)
  useEffect(() => { emitErrorRef.current = emitError }, [emitError])

  // ------------------------------------------------------------------
  // Copy
  // ------------------------------------------------------------------

  const clearCopyTimer = useCallback(() => {
    if (copyResetTimerRef.current !== null) {
      window.clearTimeout(copyResetTimerRef.current)
      copyResetTimerRef.current = null
    }
  }, [])

  const copySource = useCallback(async () => {
    if (!sfcCode.trim()) return
    try {
      await navigator.clipboard.writeText(sfcCode)
      setCopied(true)
      clearCopyTimer()
      copyResetTimerRef.current = window.setTimeout(() => {
        setCopied(false)
        copyResetTimerRef.current = null
      }, 2000)
    } catch (err) {
      console.error('[VueSfcFenceRenderer] copy failed', err)
    }
  }, [sfcCode, clearCopyTimer])

  // ------------------------------------------------------------------
  // Iframe rendering — blob URL lifecycle is owned entirely by this effect.
  // Using prevSfcCodeRef to skip re-runs was causing a Strict Mode bug:
  // the ref persisted through the double-mount cycle so the remount's effect
  // would short-circuit after cleanup had already cleared blobUrl to ''.
  // ------------------------------------------------------------------

  useEffect(() => {
    if (!sfcCode.trim()) {
      setBlobUrl((old) => {
        if (old) URL.revokeObjectURL(old)
        return ''
      })
      renderStartTimeRef.current = null
      return
    }

    renderStartTimeRef.current = performance.now()
    let createdUrl: string | null = null

    try {
      const blob = new Blob([buildHtml(sfcCode)], { type: 'text/html' })
      createdUrl = URL.createObjectURL(blob)
      const url = createdUrl
      setBlobUrl((old) => {
        if (old) URL.revokeObjectURL(old)
        return url
      })
    } catch (err) {
      renderStartTimeRef.current = null
      emitErrorRef.current('iframe-build', err)
    }

    return () => {
      if (createdUrl) URL.revokeObjectURL(createdUrl)
    }
  }, [sfcCode])

  // ------------------------------------------------------------------
  // postMessage handler
  // ------------------------------------------------------------------

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      const win = iframeRef.current?.contentWindow
      if (!win || event.source !== win) return

      if (event.data?.type === 'sfc-iframe-height') {
        // Debounce frequent height updates (e.g. from MutationObserver) to reduce layout thrashing
        if (heightDebounceRef.current !== null) clearTimeout(heightDebounceRef.current)
        const height = event.data.height
        heightDebounceRef.current = setTimeout(() => {
          heightDebounceRef.current = null
          setContainerHeight(Math.max(Number(height) || 60, 60))
        }, 16)
        return
      }
      if (event.data?.type === 'sfc-iframe-render-success') {
        // Fall back to the previously recorded render time when no active render is tracked
        const nextRenderTime =
          renderStartTimeRef.current == null
            ? internalRenderTimeRef.current
            : performance.now() - renderStartTimeRef.current

        if (typeof nextRenderTime === 'number' && Number.isFinite(nextRenderTime)) {
          internalRenderTimeRef.current = nextRenderTime
          setInternalRenderTime(nextRenderTime)
          onRenderSuccessRef.current?.({ renderTime: nextRenderTime })
        }
        renderStartTimeRef.current = null
        return
      }
      if (event.data?.type === 'sfc-iframe-error') {
        emitErrorRef.current('iframe-runtime', new Error(String(event.data.message ?? '')))
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  // emitErrorRef and onRenderSuccessRef are refs — stable references, safe to omit from deps
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount — blob URL is managed by the sfcCode effect above
  useEffect(() => {
    return () => {
      clearCopyTimer()
      if (heightDebounceRef.current !== null) clearTimeout(heightDebounceRef.current)
    }
  }, [clearCopyTimer])

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <div className="ms-sfc-card">
      <div className="ms-sfc-card-header">
        <div className="ms-sfc-card-toolbar">
          {toolbarItems.length > 0 && (
            <div className="ms-sfc-card-metrics" aria-label="render metrics">
              {toolbarItems.map((item) => (
                <span key={item} className="ms-sfc-card-metric">{item}</span>
              ))}
            </div>
          )}
          <button
            type="button"
            className="ms-sfc-card-copy"
            disabled={!sfcCode.trim()}
            onClick={copySource}
          >
            {copied ? '已复制' : '复制'}
          </button>
        </div>
      </div>

      <div className="ms-sfc-card-body">
        {blobUrl ? (
          <iframe
            ref={iframeRef}
            src={blobUrl}
            className="ms-sfc-iframe"
            style={{ height: containerHeight }}
            sandbox="allow-scripts allow-same-origin allow-modals allow-popups allow-forms"
          />
        ) : (
          <div className="ms-sfc-empty">暂无可渲染内容</div>
        )}
      </div>
    </div>
  )
}
