import { describe, it, expect } from 'vitest'
import { createMarkdownProcessor, defineTokenType } from '../src/index.js'
import type { TokenTypeDefinition, TokenMatchContext, TokenBuildContext } from '../src/index.js'

describe('Custom Token Types', () => {
  describe('defineTokenType()', () => {
    it('returns the same definition object', () => {
      const def: TokenTypeDefinition = {
        name: 'my_token',
        match(ctx: TokenMatchContext) {
          return ctx.tokens[ctx.index].type === 'my_token'
        },
        build(_ctx: TokenBuildContext) {
          return { type: 'my_token' }
        },
      }
      const result = defineTokenType(def)
      expect(result).toBe(def)
    })
  })

  describe('use() method', () => {
    it('allows chaining', () => {
      const processor = createMarkdownProcessor()
      const def = defineTokenType({
        name: 'custom',
        match() { return false },
        build() { return { type: 'custom' } },
      })
      const result = processor.use(def)
      expect(result).toBe(processor)
    })

    it('supports multiple chained use() calls', () => {
      const processor = createMarkdownProcessor()
      const def1 = defineTokenType({
        name: 'custom1',
        match() { return false },
        build() { return { type: 'custom1' } },
      })
      const def2 = defineTokenType({
        name: 'custom2',
        match() { return false },
        build() { return { type: 'custom2' } },
      })
      const result = processor.use(def1).use(def2)
      expect(result).toBe(processor)
    })
  })

  describe('custom token match and build', () => {
    it('custom token can intercept matching tokens', () => {
      // We'll test by creating a custom token that matches fence blocks
      // and transforms them differently
      const customFence = defineTokenType({
        name: 'custom_fence',
        match(ctx: TokenMatchContext) {
          const token = ctx.tokens[ctx.index]
          if (token.type === 'fence') {
            return { consumed: 1, data: { isCustom: true } }
          }
          return false
        },
        build(ctx: TokenBuildContext) {
          const token = ctx.tokens[ctx.index]
          return {
            type: 'custom_fence',
            content: token.content,
            meta: {
              lang: (token.meta?.info as string) ?? '',
              custom: true,
              ...(ctx.matchResult.data ?? {}),
            },
          }
        },
      })

      const processor = createMarkdownProcessor()
      processor.use(customFence)

      const result = processor.parse('```js\nconst x = 1\n```')
      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('custom_fence')
      expect(result[0].meta?.custom).toBe(true)
      expect(result[0].meta?.isCustom).toBe(true)
    })

    it('custom token with finalize callback', () => {
      let finalizeCalledWith: boolean | undefined

      const customParagraph = defineTokenType({
        name: 'paragraph', // Override paragraph
        match(ctx: TokenMatchContext) {
          const token = ctx.tokens[ctx.index]
          if (token.type === 'paragraph_open') {
            // Find close
            let closeIdx = ctx.index + 1
            while (closeIdx < ctx.tokens.length && ctx.tokens[closeIdx].type !== 'paragraph_close') {
              closeIdx++
            }
            return { consumed: closeIdx - ctx.index + 1 }
          }
          return false
        },
        build(ctx: TokenBuildContext) {
          const innerTokens = ctx.tokens.slice(
            ctx.index + 1,
            ctx.index + ctx.matchResult.consumed - 1
          )
          const children = ctx.buildChildren(innerTokens, [...ctx.path, 'paragraph'])
          return {
            type: 'paragraph',
            children,
            meta: { custom: true },
          }
        },
        finalize(token, ctx) {
          finalizeCalledWith = ctx.isLast
          return ctx.isLast
        },
      })

      const processor = createMarkdownProcessor()
      processor.use(customParagraph)

      const result = processor.parse('Hello world')
      expect(result[0].type).toBe('paragraph')
      expect(result[0].meta?.custom).toBe(true)
    })

    it('custom token can be registered via options', () => {
      const customDef = defineTokenType({
        name: 'fence',
        match(ctx: TokenMatchContext) {
          if (ctx.tokens[ctx.index].type === 'fence') {
            return { consumed: 1 }
          }
          return false
        },
        build(ctx: TokenBuildContext) {
          const token = ctx.tokens[ctx.index]
          return {
            type: 'fence',
            content: token.content.toUpperCase(), // Transform content
            meta: { lang: (token.meta?.info as string) ?? '' },
          }
        },
      })

      const processor = createMarkdownProcessor({
        tokenTypes: [customDef],
      })

      const result = processor.parse('```\nhello world\n```')
      expect(result[0].type).toBe('fence')
      expect(result[0].content).toBe('HELLO WORLD\n')
    })
  })

  describe('TokenRegistry behavior', () => {
    it('custom token does not affect non-matching tokens', () => {
      const noOpToken = defineTokenType({
        name: 'noop',
        match() { return false },
        build() { return { type: 'noop' } },
      })

      const processor = createMarkdownProcessor()
      processor.use(noOpToken)

      const result = processor.parse('# Title\n\nParagraph')
      expect(result.some(t => t.type === 'heading')).toBe(true)
      expect(result.some(t => t.type === 'paragraph')).toBe(true)
      expect(result.some(t => t.type === 'noop')).toBe(false)
    })
  })
})
