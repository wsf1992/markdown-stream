import { renderHook, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useMarkdownStream } from '../src/hooks/use-markdown-stream.js'

async function* asyncChunks(chunks: string[]): AsyncIterable<string> {
  for (const chunk of chunks) {
    yield chunk
  }
}

describe('useMarkdownStream', () => {
  it('parse() sets tokens to full snapshot', () => {
    const { result } = renderHook(() => useMarkdownStream())
    act(() => {
      result.current.parse('# Hello\n\nWorld')
    })
    expect(result.current.tokens.length).toBeGreaterThan(0)
    expect(result.current.tokens[0].type).toBe('heading')
  })

  it('write() accumulates and reflects snapshot', () => {
    const { result } = renderHook(() => useMarkdownStream())
    act(() => {
      result.current.write('# He')
      result.current.write('llo')
    })
    expect(result.current.tokens.length).toBeGreaterThan(0)
  })

  it('reset() clears tokens, isStreaming, error', () => {
    const { result } = renderHook(() => useMarkdownStream())
    act(() => {
      result.current.parse('# Hello')
    })
    act(() => {
      result.current.reset()
    })
    expect(result.current.tokens).toHaveLength(0)
    expect(result.current.isStreaming).toBe(false)
    expect(result.current.error).toBeUndefined()
  })

  it('consume() sets isStreaming during stream and false after', async () => {
    const { result } = renderHook(() => useMarkdownStream())

    // Use a real async pause so React can flush and commit the isStreaming=true render.
    let resumeStream!: () => void
    const pauseSignal = new Promise<void>((r) => { resumeStream = r })

    const stream = (async function* () {
      yield '# Hello'
      await pauseSignal        // hold here while we assert mid-stream state
      yield '\n\nWorld'
    })()

    // Start consuming without awaiting so we can inspect intermediate state.
    let consumePromise!: Promise<void>
    act(() => { consumePromise = result.current.consume(stream) })

    // Allow the first chunk + React re-render to flush.
    await act(async () => { await new Promise((r) => setTimeout(r, 0)) })

    expect(result.current.isStreaming).toBe(true)

    // Release the stream and wait for completion.
    resumeStream()
    await act(async () => { await consumePromise })

    expect(result.current.isStreaming).toBe(false)
  })

  it('consume() updates tokens per chunk', async () => {
    const { result } = renderHook(() => useMarkdownStream())

    // After the full stream, final snapshot must contain both heading and paragraph.
    await act(async () => {
      await result.current.consume(asyncChunks(['# Hello', '\n\nParagraph']))
    })

    const types = result.current.tokens.map((t) => t.type)
    expect(types).toContain('heading')
    expect(types).toContain('paragraph')
  })

  it('cancel() stops subsequent chunk writes', async () => {
    const { result } = renderHook(() => useMarkdownStream())

    const stream = (async function* () {
      yield '# Hello'
      result.current.cancel()
      yield '\n\nShouldNotAppear'
    })()

    await act(async () => {
      await result.current.consume(stream)
    })

    expect(result.current.tokens).toBeDefined()
  })

  it('reset() cancels in-progress consume', async () => {
    const { result } = renderHook(() => useMarkdownStream())
    let settled = false

    const stream = (async function* () {
      yield '# Hello'
      await new Promise((r) => setTimeout(r, 10))
      yield '\n\nNever'
      settled = true
    })()

    let consumePromise: Promise<void>
    act(() => {
      consumePromise = result.current.consume(stream)
    })

    act(() => {
      result.current.reset()
    })

    await act(async () => {
      await consumePromise!
    })

    expect(settled).toBe(false)
    expect(result.current.tokens).toHaveLength(0)
  })

  it('stream error sets error and resets isStreaming', async () => {
    const { result } = renderHook(() => useMarkdownStream())

    const stream = (async function* () {
      yield '# Hello'
      throw new Error('stream failure')
    })()

    await act(async () => {
      await result.current.consume(stream)
    })

    expect(result.current.error).toBeInstanceOf(Error)
    expect((result.current.error as Error).message).toBe('stream failure')
    expect(result.current.isStreaming).toBe(false)
  })
})
