import { useMemo } from 'react'
import type { StatefulToken } from '@markdown-stream/core'

export default function JsonBlock({ token }: { token: StatefulToken }) {
  const parsed = useMemo(() => {
    try {
      const content = token.content?.trim() || ''
      if (!content) return null
      return JSON.parse(content)
    } catch {
      return null
    }
  }, [token.content])

  const formattedJson = parsed ? JSON.stringify(parsed, null, 2) : ''
  const hasError = !parsed && token.content?.trim()

  const imgUrl = useMemo(() => {
    if (!parsed) return null
    const url = parsed.img || parsed.image || parsed.imageUrl || null
    if (url && typeof url === 'string' && url.startsWith('//')) {
      return 'https:' + url
    }
    return url
  }, [parsed])

  function handleCopy() {
    navigator.clipboard.writeText(formattedJson)
  }

  return (
    <div className="json-block">
      {imgUrl && (
        <div className="json-image">
          <img src={imgUrl} alt="JSON Image" />
        </div>
      )}
      <div className="json-header">
        <span className="json-badge">JSON</span>
        {parsed && (
          <button className="json-copy-btn" onClick={handleCopy}>
            复制
          </button>
        )}
      </div>
      {parsed ? (
        <pre className="json-content"><code>{formattedJson}</code></pre>
      ) : hasError ? (
        <pre className="json-error"><code>{token.content}</code></pre>
      ) : (
        <div className="json-loading">
          <span className="dots">
            <span /><span /><span />
          </span>
        </div>
      )}
    </div>
  )
}
