import type { RawToken, StatefulToken } from '../types/token.js'

export interface TokenMatchContext {
  tokens: RawToken[]
  index: number
  path: string[]
}

export interface TokenMatchResult {
  consumed: number
  data?: Record<string, unknown>
}

export interface TokenBuildContext {
  matchResult: TokenMatchResult
  tokens: RawToken[]
  index: number
  path: string[]
  buildChildren: (tokens: RawToken[], parentPath: string[]) => StatefulToken[]
}

export interface FinalizeContext {
  isLast: boolean
}

export interface TokenTypeDefinition {
  name: string
  match(ctx: TokenMatchContext): boolean | TokenMatchResult
  build(ctx: TokenBuildContext): Omit<StatefulToken, 'id' | 'state'>
  finalize?(token: StatefulToken, ctx: FinalizeContext): boolean
  // For inline content matching (e.g., pink...pink)
  matchInlineContent?(content: string): TokenMatchResult | null
}

// Helper: find matching close token
function findCloseIndex(
  tokens: RawToken[],
  startIndex: number,
  openType: string,
  closeType: string
): number {
  let depth = 1
  for (let i = startIndex + 1; i < tokens.length; i++) {
    if (tokens[i].type === openType) depth++
    if (tokens[i].type === closeType) {
      depth--
      if (depth === 0) return i
    }
  }
  return tokens.length - 1
}

const defaultTypes: TokenTypeDefinition[] = [
  // fence (nesting=0)
  {
    name: 'fence',
    match(ctx: TokenMatchContext): boolean | TokenMatchResult {
      const token = ctx.tokens[ctx.index]
      if (token.type === 'fence') {
        return { consumed: 1 }
      }
      return false
    },
    build(ctx: TokenBuildContext): Omit<StatefulToken, 'id' | 'state'> {
      const token = ctx.tokens[ctx.index]
      const lang = (token.meta?.info as string) ?? ''
      return {
        type: 'fence',
        content: token.content,
        meta: { lang },
        range: token.map
          ? { start: token.map[0], end: token.map[1] }
          : undefined,
      }
    },
  },

  // paragraph
  {
    name: 'paragraph',
    match(ctx: TokenMatchContext): boolean | TokenMatchResult {
      const token = ctx.tokens[ctx.index]
      if (token.type === 'paragraph_open') {
        const closeIdx = findCloseIndex(
          ctx.tokens,
          ctx.index,
          'paragraph_open',
          'paragraph_close'
        )
        return { consumed: closeIdx - ctx.index + 1 }
      }
      return false
    },
    build(ctx: TokenBuildContext): Omit<StatefulToken, 'id' | 'state'> {
      const openToken = ctx.tokens[ctx.index]
      const consumed = ctx.matchResult.consumed
      const innerTokens = ctx.tokens.slice(
        ctx.index + 1,
        ctx.index + consumed - 1
      )
      const children = ctx.buildChildren(innerTokens, [...ctx.path, 'paragraph'])
      return {
        type: 'paragraph',
        children,
        range: openToken.map
          ? { start: openToken.map[0], end: openToken.map[1] }
          : undefined,
      }
    },
  },

  // heading
  {
    name: 'heading',
    match(ctx: TokenMatchContext): boolean | TokenMatchResult {
      const token = ctx.tokens[ctx.index]
      if (token.type === 'heading_open') {
        const closeIdx = findCloseIndex(
          ctx.tokens,
          ctx.index,
          'heading_open',
          'heading_close'
        )
        return { consumed: closeIdx - ctx.index + 1 }
      }
      return false
    },
    build(ctx: TokenBuildContext): Omit<StatefulToken, 'id' | 'state'> {
      const openToken = ctx.tokens[ctx.index]
      const consumed = ctx.matchResult.consumed
      const innerTokens = ctx.tokens.slice(
        ctx.index + 1,
        ctx.index + consumed - 1
      )
      const children = ctx.buildChildren(innerTokens, [...ctx.path, 'heading'])
      const level = openToken.tag ? parseInt(openToken.tag.replace('h', ''), 10) : 1
      return {
        type: 'heading',
        children,
        meta: { level },
        range: openToken.map
          ? { start: openToken.map[0], end: openToken.map[1] }
          : undefined,
      }
    },
  },

  // blockquote
  {
    name: 'blockquote',
    match(ctx: TokenMatchContext): boolean | TokenMatchResult {
      const token = ctx.tokens[ctx.index]
      if (token.type === 'blockquote_open') {
        const closeIdx = findCloseIndex(
          ctx.tokens,
          ctx.index,
          'blockquote_open',
          'blockquote_close'
        )
        return { consumed: closeIdx - ctx.index + 1 }
      }
      return false
    },
    build(ctx: TokenBuildContext): Omit<StatefulToken, 'id' | 'state'> {
      const openToken = ctx.tokens[ctx.index]
      const consumed = ctx.matchResult.consumed
      const innerTokens = ctx.tokens.slice(
        ctx.index + 1,
        ctx.index + consumed - 1
      )
      const children = ctx.buildChildren(innerTokens, [...ctx.path, 'blockquote'])
      return {
        type: 'blockquote',
        children,
        range: openToken.map
          ? { start: openToken.map[0], end: openToken.map[1] }
          : undefined,
      }
    },
  },

  // bullet_list
  {
    name: 'bullet_list',
    match(ctx: TokenMatchContext): boolean | TokenMatchResult {
      const token = ctx.tokens[ctx.index]
      if (token.type === 'bullet_list_open') {
        const closeIdx = findCloseIndex(
          ctx.tokens,
          ctx.index,
          'bullet_list_open',
          'bullet_list_close'
        )
        return { consumed: closeIdx - ctx.index + 1 }
      }
      return false
    },
    build(ctx: TokenBuildContext): Omit<StatefulToken, 'id' | 'state'> {
      const openToken = ctx.tokens[ctx.index]
      const consumed = ctx.matchResult.consumed
      const innerTokens = ctx.tokens.slice(
        ctx.index + 1,
        ctx.index + consumed - 1
      )
      const children = ctx.buildChildren(innerTokens, [...ctx.path, 'bullet_list'])
      return {
        type: 'bullet_list',
        children,
        range: openToken.map
          ? { start: openToken.map[0], end: openToken.map[1] }
          : undefined,
      }
    },
  },

  // ordered_list
  {
    name: 'ordered_list',
    match(ctx: TokenMatchContext): boolean | TokenMatchResult {
      const token = ctx.tokens[ctx.index]
      if (token.type === 'ordered_list_open') {
        const closeIdx = findCloseIndex(
          ctx.tokens,
          ctx.index,
          'ordered_list_open',
          'ordered_list_close'
        )
        return { consumed: closeIdx - ctx.index + 1 }
      }
      return false
    },
    build(ctx: TokenBuildContext): Omit<StatefulToken, 'id' | 'state'> {
      const openToken = ctx.tokens[ctx.index]
      const consumed = ctx.matchResult.consumed
      const innerTokens = ctx.tokens.slice(
        ctx.index + 1,
        ctx.index + consumed - 1
      )
      const children = ctx.buildChildren(innerTokens, [...ctx.path, 'ordered_list'])
      return {
        type: 'ordered_list',
        children,
        range: openToken.map
          ? { start: openToken.map[0], end: openToken.map[1] }
          : undefined,
      }
    },
  },

  // list_item
  {
    name: 'list_item',
    match(ctx: TokenMatchContext): boolean | TokenMatchResult {
      const token = ctx.tokens[ctx.index]
      if (token.type === 'list_item_open') {
        const closeIdx = findCloseIndex(
          ctx.tokens,
          ctx.index,
          'list_item_open',
          'list_item_close'
        )
        return { consumed: closeIdx - ctx.index + 1 }
      }
      return false
    },
    build(ctx: TokenBuildContext): Omit<StatefulToken, 'id' | 'state'> {
      const openToken = ctx.tokens[ctx.index]
      const consumed = ctx.matchResult.consumed
      const innerTokens = ctx.tokens.slice(
        ctx.index + 1,
        ctx.index + consumed - 1
      )
      const children = ctx.buildChildren(innerTokens, [...ctx.path, 'list_item'])
      return {
        type: 'list_item',
        children,
        range: openToken.map
          ? { start: openToken.map[0], end: openToken.map[1] }
          : undefined,
      }
    },
  },
]

export class TokenRegistry {
  private types: TokenTypeDefinition[] = []
  // Track which names are defaults so we can place custom types before them
  private defaultNames: Set<string> = new Set()

  constructor() {
    // Register defaults
    for (const def of defaultTypes) {
      this.types.push(def)
      this.defaultNames.add(def.name)
    }
  }

  register(def: TokenTypeDefinition): this {
    // Allow overriding by name
    const existingIdx = this.types.findIndex((t) => t.name === def.name)
    if (existingIdx >= 0) {
      this.types[existingIdx] = def
    } else {
      // User-registered types go before defaults to have higher priority
      // Find the first default type index and insert before it
      const firstDefaultIdx = this.types.findIndex((t) => this.defaultNames.has(t.name))
      if (firstDefaultIdx >= 0) {
        this.types.splice(firstDefaultIdx, 0, def)
      } else {
        this.types.push(def)
      }
    }
    return this
  }

  match(
    ctx: TokenMatchContext
  ): { def: TokenTypeDefinition; result: TokenMatchResult } | null {
    for (const def of this.types) {
      const matchResult = def.match(ctx)
      if (matchResult === false) continue
      if (matchResult === true) {
        return { def, result: { consumed: 1 } }
      }
      return { def, result: matchResult }
    }
    return null
  }

  /**
   * 内联级别的 token 匹配（用于 inline token 的 children）。
   * 返回匹配到的 token 数量（从 open 到 close）。
   */
  matchInline(
    ctx: TokenMatchContext
  ): { def: TokenTypeDefinition; result: TokenMatchResult; closeIndex: number } | null {
    for (const def of this.types) {
      const matchResult = def.match(ctx)
      if (matchResult === false) continue
      // 对于内联匹配，matchResult 应该是 { consumed: n } 格式，表示到 close token 的距离
      const consumed = matchResult === true ? 1 : matchResult.consumed
      const closeIndex = ctx.index + consumed - 1
      return { def, result: { consumed }, closeIndex }
    }
    return null
  }

  getDefaultTypes(): TokenTypeDefinition[] {
    return [...defaultTypes]
  }

  getTokenDefinitions(): TokenTypeDefinition[] {
    return [...this.types]
  }
}
