import { useState, useRef, useEffect, useCallback } from 'react'
import {
  createMarkdownProcessor,
  type MarkdownProcessor,
  type StatefulToken,
  type TokenTypeDefinition,
} from '@markdown-stream/core'

export interface UseMarkdownStreamOptions {
  processor?: MarkdownProcessor
  tokenTypes?: TokenTypeDefinition[]
  immediateSource?: string
  debug?: boolean
}

export interface UseMarkdownStreamReturn {
  tokens: StatefulToken[]
  isStreaming: boolean
  error: unknown
  parse: (markdown: string) => void
  write: (chunk: string) => void
  reset: () => void
  cancel: () => void
  consume: (stream: AsyncIterable<string>) => Promise<void>
}

export function useMarkdownStream(
  options?: UseMarkdownStreamOptions
): UseMarkdownStreamReturn {
  // Processor is created once and stored in a ref
  const processorRef = useRef<MarkdownProcessor>(null as unknown as MarkdownProcessor)
  if (!processorRef.current) {
    processorRef.current =
      options?.processor ??
      createMarkdownProcessor({ tokenTypes: options?.tokenTypes })
  }

  // Lazy-initialize tokens from immediateSource if provided
  const [tokens, setTokens] = useState<StatefulToken[]>(() => {
    if (options?.immediateSource !== undefined) {
      processorRef.current.parse(options.immediateSource)
      return processorRef.current.snapshot()
    }
    return []
  })
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<unknown>(undefined)

  const debug = options?.debug ?? false
  const currentRunIdRef = useRef(0)
  const prevStateMapRef = useRef(new Map<string, string>())

  function logTokenChanges(next: StatefulToken[]): void {
    for (const token of next) {
      const prev = prevStateMapRef.current.get(token.id)
      if (prev !== token.state) {
        if (prev === undefined) {
          console.log(`[MarkdownStream] token:new   id=${token.id} type=${token.type} state=${token.state}`)
        } else {
          console.log(`[MarkdownStream] token:state id=${token.id} type=${token.type} ${prev} → ${token.state}`)
        }
        prevStateMapRef.current.set(token.id, token.state)
      }
    }
  }

  const updateTokens = useCallback((next: StatefulToken[]): void => {
    if (debug) logTokenChanges(next)
    setTokens([...next])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debug])

  const cancel = useCallback((): void => {
    currentRunIdRef.current++
  }, [])

  const parse = useCallback((markdown: string): void => {
    processorRef.current.parse(markdown)
    updateTokens(processorRef.current.snapshot())
  }, [updateTokens])

  const write = useCallback((chunk: string): void => {
    processorRef.current.write(chunk)
    updateTokens(processorRef.current.snapshot())
  }, [updateTokens])

  const reset = useCallback((): void => {
    currentRunIdRef.current++
    processorRef.current.reset()
    prevStateMapRef.current.clear()
    setTokens([])
    setIsStreaming(false)
    setError(undefined)
  }, [])

  const consume = useCallback(async (stream: AsyncIterable<string>): Promise<void> => {
    currentRunIdRef.current++
    const localId = currentRunIdRef.current

    setIsStreaming(true)
    setError(undefined)

    try {
      for await (const chunk of stream) {
        if (localId !== currentRunIdRef.current) break
        processorRef.current.write(chunk)
        updateTokens(processorRef.current.snapshot())
      }
      if (localId === currentRunIdRef.current) {
        processorRef.current.flush()
        updateTokens(processorRef.current.snapshot())
      }
    } catch (err) {
      if (localId === currentRunIdRef.current) {
        setError(err)
      }
    } finally {
      if (localId === currentRunIdRef.current) {
        setIsStreaming(false)
      }
    }
  }, [updateTokens])

  // Cancel on unmount to stop any in-progress streams
  useEffect(() => {
    return () => {
      currentRunIdRef.current++
    }
  }, [])

  return { tokens, isStreaming, error, parse, write, reset, cancel, consume }
}
