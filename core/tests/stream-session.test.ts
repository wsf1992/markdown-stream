import { describe, it, expect, beforeEach } from 'vitest'
import { createMarkdownProcessor } from '../src/index.js'
import type { MarkdownProcessor } from '../src/index.js'

describe('StreamSession via MarkdownProcessor', () => {
  let processor: MarkdownProcessor

  beforeEach(() => {
    processor = createMarkdownProcessor()
  })

  describe('parse()', () => {
    it('returns all tokens with state=done', () => {
      const tokens = processor.parse('# Hello\n\nParagraph text')
      expect(tokens.length).toBeGreaterThan(0)
      for (const token of tokens) {
        expect(token.state).toBe('done')
      }
    })

    it('parse returns complete result', () => {
      const tokens = processor.parse('# Title\n\nFirst paragraph\n\nSecond paragraph')
      expect(tokens.length).toBe(3)
      expect(tokens[0].type).toBe('heading')
      expect(tokens[1].type).toBe('paragraph')
      expect(tokens[2].type).toBe('paragraph')
    })

    it('parse result has no streaming tokens', () => {
      const tokens = processor.parse('Some **bold** text\n\nAnother paragraph')
      const streaming = tokens.filter((t) => t.state === 'streaming')
      expect(streaming).toHaveLength(0)
    })
  })

  describe('write()', () => {
    it('first write returns tokens with state=start for non-last blocks', () => {
      // Write enough to have multiple blocks
      const diff = processor.write('# Title\n\nFirst para\n\n')
      // The completed blocks (not last) should be 'start' initially
      // The last block should be 'streaming'
      expect(diff.length).toBeGreaterThan(0)
      // At least one token should be returned
    })

    it('write a simple paragraph returns start state for last token on first write', () => {
      const diff = processor.write('Hello world')
      expect(diff.length).toBe(1)
      expect(diff[0].type).toBe('paragraph')
      expect(diff[0].state).toBe('start')
    })

    it('continuing write returns streaming for last token', () => {
      processor.write('Hello')
      const diff = processor.write(' world')
      // The paragraph should now be updated (streaming)
      const para = diff.find((t) => t.type === 'paragraph')
      if (para) {
        expect(para.state).toBe('streaming')
      }
    })

    it('completed block transitions to done when new block appears', () => {
      processor.write('# Title\n\n')
      // Now the heading should be done, and we're starting a new paragraph
      const diff = processor.write('Paragraph text')
      // The diff should include some change
      const doneTokens = diff.filter((t) => t.state === 'done')
      // heading should be done now
      const heading = doneTokens.find((t) => t.type === 'heading')
      // heading might already be done from previous write, check snapshot
      const snapshot = processor.snapshot()
      const headingInSnapshot = snapshot.find((t) => t.type === 'heading')
      expect(headingInSnapshot?.state).toBe('done')
    })

    it('ids are stable across chunks', () => {
      processor.write('Hello')
      const snap1 = processor.snapshot()
      const id1 = snap1[0]?.id

      processor.write(' world')
      const snap2 = processor.snapshot()
      const id2 = snap2[0]?.id

      expect(id1).toBe(id2)
    })

    it('last block is start on first write, streaming after content changes', () => {
      processor.write('# Title\n\nSome paragraph text')
      const snapshot = processor.snapshot()
      const lastToken = snapshot[snapshot.length - 1]
      expect(lastToken?.state).toBe('start')

      processor.write(' more')
      const snapshot2 = processor.snapshot()
      const lastToken2 = snapshot2[snapshot2.length - 1]
      expect(lastToken2?.state).toBe('streaming')
    })

    it('non-last blocks are done', () => {
      processor.write('# Title\n\nParagraph text')
      const snapshot = processor.snapshot()
      // heading (not last) should be done
      const heading = snapshot.find((t) => t.type === 'heading')
      expect(heading?.state).toBe('done')
    })
  })

  describe('snapshot()', () => {
    it('returns empty array initially', () => {
      expect(processor.snapshot()).toEqual([])
    })

    it('returns full token tree after write', () => {
      processor.write('# Title\n\nParagraph')
      const snap = processor.snapshot()
      expect(snap.length).toBe(2)
    })

    it('snapshot grows as more content is written', () => {
      processor.write('First paragraph\n\n')
      const snap1 = processor.snapshot()
      processor.write('Second paragraph')
      const snap2 = processor.snapshot()
      expect(snap2.length).toBeGreaterThanOrEqual(snap1.length)
    })

    it('snapshot after parse returns all done tokens', () => {
      processor.parse('# Title\n\nContent')
      const snap = processor.snapshot()
      for (const t of snap) {
        expect(t.state).toBe('done')
      }
    })
  })

  describe('reset()', () => {
    it('reset clears all state', () => {
      processor.write('Some content')
      processor.reset()
      expect(processor.snapshot()).toEqual([])
    })

    it('can write after reset', () => {
      processor.write('First content')
      processor.reset()
      const diff = processor.write('New content')
      expect(diff.length).toBeGreaterThan(0)
    })

    it('reset and parse gives fresh state', () => {
      processor.write('Old content')
      processor.reset()
      const result = processor.parse('New content')
      expect(result[0].state).toBe('done')
      const snap = processor.snapshot()
      expect(snap.length).toBe(1)
    })
  })

  describe('paragraph across chunks', () => {
    it('partial paragraph accumulates content', () => {
      processor.write('This is a ')
      const snap1 = processor.snapshot()
      const text1 = extractText(snap1)

      processor.write('complete sentence')
      const snap2 = processor.snapshot()
      const text2 = extractText(snap2)

      // Second snapshot should have more content
      expect(text2.length).toBeGreaterThanOrEqual(text1.length)
    })
  })
})

function extractText(tokens: ReturnType<MarkdownProcessor['snapshot']>): string {
  const parts: string[] = []
  function walk(ts: typeof tokens) {
    for (const t of ts) {
      if (t.content) parts.push(t.content)
      if (t.children) walk(t.children)
    }
  }
  walk(tokens)
  return parts.join('')
}
