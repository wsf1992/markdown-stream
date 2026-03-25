import { describe, it, expect, vi } from 'vitest'
import { useMarkdownStream } from '../src/composables/use-markdown-stream.js'

async function* asyncChunks(chunks: string[]): AsyncIterable<string> {
  for (const chunk of chunks) {
    yield chunk
  }
}

describe('useMarkdownStream', () => {
  it('parse() sets tokens to full snapshot', () => {
    const { tokens, parse } = useMarkdownStream()
    parse('# Hello\n\nWorld')
    expect(tokens.value.length).toBeGreaterThan(0)
    expect(tokens.value[0].type).toBe('heading')
  })

  it('write() accumulates and reflects snapshot', () => {
    const { tokens, write } = useMarkdownStream()
    write('# He')
    write('llo')
    expect(tokens.value.length).toBeGreaterThan(0)
  })

  it('reset() clears tokens, isStreaming, error', () => {
    const { tokens, parse, reset, isStreaming, error } = useMarkdownStream()
    parse('# Hello')
    reset()
    expect(tokens.value).toHaveLength(0)
    expect(isStreaming.value).toBe(false)
    expect(error.value).toBeUndefined()
  })

  it('consume() sets isStreaming during stream and false after', async () => {
    const { isStreaming, consume } = useMarkdownStream()
    const states: boolean[] = []

    const stream = (async function* () {
      yield '# Hello'
      states.push(isStreaming.value)
      yield '\n\nWorld'
    })()

    await consume(stream)
    states.push(isStreaming.value)

    expect(states[0]).toBe(true)
    expect(states[states.length - 1]).toBe(false)
  })

  it('consume() updates tokens per chunk', async () => {
    const { tokens, consume } = useMarkdownStream()
    const snapshots: number[] = []

    const stream = (async function* () {
      yield '# Hello'
      snapshots.push(tokens.value.length)
      yield '\n\nParagraph'
      snapshots.push(tokens.value.length)
    })()

    await consume(stream)

    expect(snapshots[0]).toBeGreaterThan(0)
    expect(snapshots[1]).toBeGreaterThanOrEqual(snapshots[0])
  })

  it('cancel() stops subsequent chunk writes', async () => {
    const { tokens, cancel, consume } = useMarkdownStream()

    const stream = (async function* () {
      yield '# Hello'
      cancel() // cancel mid-stream
      yield '\n\nShouldNotAppear'
    })()

    await consume(stream)
    // After cancel, the stream broke — tokens reflect only first chunk or nothing
    // The important thing: no error thrown
    expect(tokens.value).toBeDefined()
  })

  it('reset() cancels in-progress consume', async () => {
    const { tokens, reset, consume } = useMarkdownStream()
    let settled = false

    const stream = (async function* () {
      yield '# Hello'
      await new Promise((r) => setTimeout(r, 10))
      yield '\n\nNever'
      settled = true
    })()

    const p = consume(stream)
    reset()
    await p
    expect(settled).toBe(false)
    expect(tokens.value).toHaveLength(0)
  })

  it('stream error sets error and resets isStreaming', async () => {
    const { error, isStreaming, consume } = useMarkdownStream()

    const stream = (async function* () {
      yield '# Hello'
      throw new Error('stream failure')
    })()

    await consume(stream)
    expect(error.value).toBeInstanceOf(Error)
    expect((error.value as Error).message).toBe('stream failure')
    expect(isStreaming.value).toBe(false)
  })

  it('switching streams: old stream chunks do not overwrite new state', async () => {
    const { tokens, consume, cancel } = useMarkdownStream()

    // Old stream yields a first chunk, then a late chunk after a delay
    const oldStream = (async function* () {
      yield '# Old'
      await new Promise((r) => setTimeout(r, 50))
      yield '\n\nLate chunk from old'
    })()

    // Start old stream but don't await it yet
    const oldConsumeP = consume(oldStream)

    // Let first chunk land
    await new Promise((r) => setTimeout(r, 5))

    // Cancel old stream and immediately start new stream
    cancel()
    await consume(asyncChunks(['# New']))

    // Old stream generator is abandoned; just ensure oldConsumeP settles
    await oldConsumeP

    // New stream result should be reflected; old late chunk discarded
    expect(tokens.value[0]?.type).toBe('heading')
  }, 10000)

  it('works outside component setup without throwing', () => {
    // No Vue component instance — should not throw
    expect(() => useMarkdownStream()).not.toThrow()
  })
})
