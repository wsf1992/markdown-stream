import React, { useEffect, useRef, useMemo } from 'react'
import { useMarkdownStream } from '../hooks/use-markdown-stream.js'
import { MarkdownTokenNode, ComponentsContext, StreamingContext } from './MarkdownTokenNode.js'
import type { MarkdownStreamProps } from '../types/props.js'
import type { CustomTokenDefinition } from '../types/renderer.js'
import { extractTokenTypes, extractComponentMap } from '../renderers/build-token-type.js'

export function MarkdownStream({
  content,
  source,
  stream,
  tokenTypes,
  components,
  debug,
  cursor = false,
  className,
}: MarkdownStreamProps) {
  // Extract token types from custom components array — only on mount, not reactive
  const autoTokenTypesRef = useRef(
    Array.isArray(components) ? extractTokenTypes(components as CustomTokenDefinition[]) : []
  )

  const { tokens, isStreaming, error, consume, parse, reset, cancel } = useMarkdownStream({
    tokenTypes: [...(tokenTypes ?? []), ...autoTokenTypesRef.current],
    debug,
  })

  // Build component map — same as Vue: evaluated once, not reactive
  const componentMap = useMemo(() => {
    if (!components) return {}
    if (Array.isArray(components)) {
      return extractComponentMap(components as CustomTokenDefinition[])
    }
    return components
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const prevValueRef = useRef<string | AsyncIterable<string> | undefined>(undefined)

  useEffect(() => {
    const value = content ?? source ?? stream
    if (value === undefined) return
    let cancelled = false

    const prevValue = prevValueRef.current
    prevValueRef.current = value

    // Streaming → Static transition: cancel async loop, then parse final text.
    const wasStreaming = prevValue != null && typeof prevValue !== 'string'
    if (wasStreaming && typeof value === 'string') {
      cancel()
      parse(value)
      return
    }

    reset()
    if (typeof value === 'string') {
      parse(value)
    } else {
      // Delay async consumption by one microtask so React StrictMode's
      // mount/unmount rehearsal does not consume single-use streams.
      queueMicrotask(() => {
        if (cancelled) return
        void consume(value)
      })
      return () => {
        cancelled = true
      }
    }
  }, [content, source, stream]) // eslint-disable-line react-hooks/exhaustive-deps

  const rootClass = ['ms-root', className].filter(Boolean).join(' ')

  return (
    <ComponentsContext.Provider value={componentMap}>
      <StreamingContext.Provider value={isStreaming}>
        <div
          className={rootClass}
          data-streaming={isStreaming ? '' : undefined}
          data-no-cursor={!cursor ? '' : undefined}
        >
          {tokens.map((token) => (
            <MarkdownTokenNode key={token.id} token={token} />
          ))}
          {error != null && (
            <div className="ms-stream-error" role="alert">
              {error instanceof Error ? error.message : String(error)}
            </div>
          )}
        </div>
      </StreamingContext.Provider>
    </ComponentsContext.Provider>
  )
}
