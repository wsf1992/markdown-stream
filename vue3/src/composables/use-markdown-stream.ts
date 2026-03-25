import { ref, getCurrentInstance, onUnmounted } from 'vue'
import type { Ref } from 'vue'
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
}

export interface UseMarkdownStreamReturn {
  tokens: Ref<StatefulToken[]>
  isStreaming: Ref<boolean>
  error: Ref<unknown>
  parse: (markdown: string) => void
  write: (chunk: string) => void
  reset: () => void
  cancel: () => void
  consume: (stream: AsyncIterable<string>) => Promise<void>
}

export function useMarkdownStream(
  options?: UseMarkdownStreamOptions
): UseMarkdownStreamReturn {
  const processor: MarkdownProcessor =
    options?.processor ??
    createMarkdownProcessor({ tokenTypes: options?.tokenTypes })

  const tokens = ref<StatefulToken[]>([])
  const isStreaming = ref(false)
  const error = ref<unknown>(undefined)

  let currentRunId = 0

  function cancel(): void {
    currentRunId++
  }

  function parse(markdown: string): void {
    processor.parse(markdown)
    tokens.value = processor.snapshot()
  }

  function write(chunk: string): void {
    processor.write(chunk)
    tokens.value = processor.snapshot()
  }

  function reset(): void {
    cancel()
    processor.reset()
    tokens.value = []
    isStreaming.value = false
    error.value = undefined
  }

  async function consume(stream: AsyncIterable<string>): Promise<void> {
    cancel()
    const localId = currentRunId

    isStreaming.value = true
    error.value = undefined

    try {
      for await (const chunk of stream) {
        if (localId !== currentRunId) break
        write(chunk)
      }
    } catch (err) {
      if (localId === currentRunId) {
        error.value = err
      }
    } finally {
      if (localId === currentRunId) {
        isStreaming.value = false
      }
    }
  }

  // Auto-cancel on unmount when called inside a component setup
  if (getCurrentInstance()) {
    onUnmounted(() => cancel())
  }

  if (options?.immediateSource !== undefined) {
    parse(options.immediateSource)
  }

  return { tokens, isStreaming, error, parse, write, reset, cancel, consume }
}
