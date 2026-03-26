import type { RawToken, StatefulToken } from '../types/token.js'
import { TokenRegistry } from './token-registry.js'

// Generate a stable id based on type + path + index
function generateId(type: string, path: string[], index: number): string {
  const pathStr = path.join('/')
  return pathStr ? `${pathStr}/${type}[${index}]` : `${type}[${index}]`
}

// Inline token type mapping
const INLINE_OPEN_CLOSE_MAP: Record<string, string> = {
  strong_open: 'strong',
  strong_close: 'strong',
  em_open: 'em',
  em_close: 'em',
  link_open: 'link',
  link_close: 'link',
  s_open: 's',
  s_close: 's',
}

const INLINE_SELF_CLOSING: Set<string> = new Set([
  'code_inline',
  'softbreak',
  'hardbreak',
  'text',
  'html_inline',
  'image',
])

function buildInlineChildren(
  tokens: RawToken[],
  parentPath: string[],
  registry?: TokenRegistry
): StatefulToken[] {
  const result: StatefulToken[] = []
  let i = 0
  const typeCount: Record<string, number> = {}

  while (i < tokens.length) {
    const token = tokens[i]

    // Try registry match first (for custom inline tokens)
    if (registry) {
      const matchCtx = { tokens, index: i, path: parentPath }
      const matched = registry.matchInline(matchCtx)
      if (matched) {
        const { def, closeIndex } = matched
        const tokenName = def.name
        typeCount[tokenName] = (typeCount[tokenName] ?? 0) + 1
        const id = generateId(tokenName, parentPath, typeCount[tokenName] - 1)

        const innerTokens = tokens.slice(i + 1, closeIndex)
        const children = innerTokens.length > 0
          ? buildInlineChildren(innerTokens, [...parentPath, tokenName], registry)
          : undefined

        const openToken = tokens[i]
        const statefulToken: StatefulToken = {
          id,
          type: tokenName,
          state: 'done',
          children,
          meta: openToken.meta ? { ...openToken.meta } : undefined,
        }

        result.push(statefulToken)
        i = closeIndex + 1
        continue
      }
    }

    // Handle open tokens that pair with close tokens
    const pairedType = INLINE_OPEN_CLOSE_MAP[token.type]
    if (pairedType && token.nesting === 1) {
      // Find the matching close
      const openType = token.type
      const closeType = openType.replace('_open', '_close')
      let depth = 1
      let closeIdx = i + 1
      for (; closeIdx < tokens.length; closeIdx++) {
        if (tokens[closeIdx].type === openType) depth++
        if (tokens[closeIdx].type === closeType) {
          depth--
          if (depth === 0) break
        }
      }
      typeCount[pairedType] = (typeCount[pairedType] ?? 0) + 1
      const id = generateId(pairedType, parentPath, typeCount[pairedType] - 1)

      // Inner tokens
      const innerTokens = tokens.slice(i + 1, closeIdx)
      const children =
        innerTokens.length > 0
          ? buildInlineChildren(innerTokens, [...parentPath, pairedType], registry)
          : undefined

      const attrs = token.attrs

      const statefulToken: StatefulToken = {
        id,
        type: pairedType,
        state: 'done',
        children,
        meta: attrs ? { attrs } : undefined,
      }

      result.push(statefulToken)
      i = closeIdx + 1
      continue
    }

    // Handle self-closing inline tokens
    if (INLINE_SELF_CLOSING.has(token.type)) {
      typeCount[token.type] = (typeCount[token.type] ?? 0) + 1
      const id = generateId(token.type, parentPath, typeCount[token.type] - 1)
      const statefulToken: StatefulToken = {
        id,
        type: token.type,
        state: 'done',
        content: token.content || undefined,
      }
      result.push(statefulToken)
      i++
      continue
    }

    // Skip unknown tokens silently
    i++
  }

  return result
}

export class TokenAssembler {
  private registry: TokenRegistry

  constructor(registry?: TokenRegistry) {
    this.registry = registry ?? new TokenRegistry()
  }

  assemble(rawTokens: RawToken[]): StatefulToken[] {
    return this.buildTokens(rawTokens, [])
  }

  buildChildren(tokens: RawToken[], parentPath: string[]): StatefulToken[] {
    return this.buildTokens(tokens, parentPath)
  }

  private buildTokens(tokens: RawToken[], path: string[]): StatefulToken[] {
    const result: StatefulToken[] = []
    let i = 0
    const typeCount: Record<string, number> = {}

    while (i < tokens.length) {
      const token = tokens[i]

      // Handle inline tokens (with children from markdown-it)
      if (token.type === 'inline') {
        const inlineChildren = token.children ?? []
        const inlineStateful = buildInlineChildren(inlineChildren, [
          ...path,
          'inline',
        ], this.registry)
        // We return an inline wrapper token
        typeCount['inline'] = (typeCount['inline'] ?? 0) + 1
        const id = generateId('inline', path, typeCount['inline'] - 1)
        result.push({
          id,
          type: 'inline',
          state: 'done',
          children: inlineStateful,
        })
        i++
        continue
      }

      // Try registry match
      const matchCtx = { tokens, index: i, path }
      const matched = this.registry.match(matchCtx)

      if (matched) {
        const { def, result: matchResult } = matched
        const tokenName = def.name
        typeCount[tokenName] = (typeCount[tokenName] ?? 0) + 1
        const id = generateId(tokenName, path, typeCount[tokenName] - 1)

        const buildCtx = {
          matchResult,
          tokens,
          index: i,
          path,
          buildChildren: (innerTokens: RawToken[], innerPath: string[]) =>
            this.buildChildren(innerTokens, innerPath),
        }

        const partial = def.build(buildCtx)
        const statefulToken: StatefulToken = {
          id,
          state: 'done',
          ...partial,
        }

        result.push(statefulToken)
        i += matchResult.consumed
        continue
      }

      // Skip unrecognized tokens
      i++
    }

    return result
  }
}
