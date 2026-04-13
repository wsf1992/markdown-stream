import { describe, it, expect } from 'vitest'
import { MarkdownItAdapter } from '../src/parser/markdown-it-adapter.js'
import { TokenAssembler } from '../src/core/token-assembler.js'
// Note: these tests import directly from internal modules (not index.ts) to stay focused on assembly logic.

function assemble(markdown: string) {
  const adapter = new MarkdownItAdapter()
  const assembler = new TokenAssembler()
  const raw = adapter.parse(markdown)
  return assembler.assemble(raw)
}

describe('TokenAssembler', () => {
  describe('paragraph', () => {
    it('parses a simple paragraph', () => {
      const tokens = assemble('Hello world')
      expect(tokens).toHaveLength(1)
      expect(tokens[0].type).toBe('paragraph')
      expect(tokens[0].id).toContain('paragraph')
      expect(tokens[0].children).toBeDefined()
    })

    it('paragraph children contain inline content directly (no inline wrapper)', () => {
      const tokens = assemble('Hello world')
      const para = tokens[0]
      expect(para.type).toBe('paragraph')
      // inline children are flattened directly into paragraph.children
      const text = para.children?.[0]
      expect(text?.type).toBe('text')
      expect(text?.content).toBe('Hello world')
    })

    it('multiple paragraphs get separate ids', () => {
      const tokens = assemble('First\n\nSecond')
      expect(tokens).toHaveLength(2)
      expect(tokens[0].id).not.toBe(tokens[1].id)
      expect(tokens[0].type).toBe('paragraph')
      expect(tokens[1].type).toBe('paragraph')
    })
  })

  describe('heading', () => {
    it('parses h1', () => {
      const tokens = assemble('# Heading 1')
      expect(tokens[0].type).toBe('heading')
      expect(tokens[0].meta?.level).toBe(1)
    })

    it('parses h2', () => {
      const tokens = assemble('## Heading 2')
      expect(tokens[0].type).toBe('heading')
      expect(tokens[0].meta?.level).toBe(2)
    })

    it('parses h3 through h6', () => {
      for (let level = 3; level <= 6; level++) {
        const tokens = assemble(`${'#'.repeat(level)} Heading ${level}`)
        expect(tokens[0].type).toBe('heading')
        expect(tokens[0].meta?.level).toBe(level)
      }
    })

    it('heading has inline children directly (no inline wrapper)', () => {
      const tokens = assemble('# My Title')
      const heading = tokens[0]
      expect(heading.children).toBeDefined()
      // inline children are flattened directly, no intermediate 'inline' wrapper
      const text = heading.children?.[0]
      expect(text?.type).toBe('text')
    })
  })

  describe('fence (code block)', () => {
    it('parses a fence block', () => {
      const tokens = assemble('```js\nconsole.log("hi")\n```')
      expect(tokens[0].type).toBe('fence')
    })

    it('fence has correct content', () => {
      const tokens = assemble('```js\nconsole.log("hi")\n```')
      expect(tokens[0].content).toContain('console.log')
    })

    it('fence stores language in meta.lang', () => {
      const tokens = assemble('```typescript\nconst x = 1\n```')
      expect(tokens[0].meta?.lang).toBe('typescript')
    })

    it('fence with no language has empty lang', () => {
      const tokens = assemble('```\nplain code\n```')
      expect(tokens[0].meta?.lang).toBe('')
    })
  })

  describe('bullet_list', () => {
    it('parses a bullet list', () => {
      const tokens = assemble('- item 1\n- item 2\n- item 3')
      expect(tokens[0].type).toBe('bullet_list')
    })

    it('bullet list has list_item children', () => {
      const tokens = assemble('- item 1\n- item 2')
      const list = tokens[0]
      const items = list.children?.filter((c) => c.type === 'list_item')
      expect(items?.length).toBe(2)
    })
  })

  describe('ordered_list', () => {
    it('parses an ordered list', () => {
      const tokens = assemble('1. first\n2. second\n3. third')
      expect(tokens[0].type).toBe('ordered_list')
    })

    it('ordered list has list_item children', () => {
      const tokens = assemble('1. first\n2. second')
      const list = tokens[0]
      const items = list.children?.filter((c) => c.type === 'list_item')
      expect(items?.length).toBe(2)
    })
  })

  describe('blockquote', () => {
    it('parses a blockquote', () => {
      const tokens = assemble('> This is a quote')
      expect(tokens[0].type).toBe('blockquote')
    })

    it('blockquote has paragraph children', () => {
      const tokens = assemble('> This is a quote')
      const bq = tokens[0]
      const para = bq.children?.find((c) => c.type === 'paragraph')
      expect(para).toBeDefined()
    })
  })

  describe('inline elements', () => {
    it('parses strong (bold)', () => {
      const tokens = assemble('**bold text**')
      const para = tokens[0]
      // inline children are directly in para.children (no wrapper)
      const strong = para.children?.find((c) => c.type === 'strong')
      expect(strong).toBeDefined()
    })

    it('parses em (italic)', () => {
      const tokens = assemble('*italic text*')
      const para = tokens[0]
      const em = para.children?.find((c) => c.type === 'em')
      expect(em).toBeDefined()
    })

    it('parses link', () => {
      const tokens = assemble('[link text](https://example.com)')
      const para = tokens[0]
      const link = para.children?.find((c) => c.type === 'link')
      expect(link).toBeDefined()
    })

    it('parses code_inline', () => {
      const tokens = assemble('Use `console.log` for debugging')
      const para = tokens[0]
      const code = para.children?.find((c) => c.type === 'code_inline')
      expect(code).toBeDefined()
      expect(code?.content).toBe('console.log')
    })

    it('parses mixed inline', () => {
      const tokens = assemble('Text with **bold** and *italic* and `code`')
      const para = tokens[0]
      expect(para.children?.some((c) => c.type === 'strong')).toBe(true)
      expect(para.children?.some((c) => c.type === 'em')).toBe(true)
      expect(para.children?.some((c) => c.type === 'code_inline')).toBe(true)
    })
  })

  describe('stable ids', () => {
    it('same content produces same id', () => {
      const tokens1 = assemble('# Hello\n\nParagraph')
      const tokens2 = assemble('# Hello\n\nParagraph')
      expect(tokens1[0].id).toBe(tokens2[0].id)
      expect(tokens1[1].id).toBe(tokens2[1].id)
    })

    it('ids are unique within the same document', () => {
      const tokens = assemble('First\n\nSecond\n\nThird')
      const ids = tokens.map((t) => t.id)
      const unique = new Set(ids)
      expect(unique.size).toBe(ids.length)
    })
  })
})
