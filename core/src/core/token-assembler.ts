import type { RawToken, StatefulToken } from '../types/token.js'
import type { TokenTypeDefinition } from './token-registry.js'
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

  // Get contentRegex token definitions for inline matching
  const contentRegexDefs = registry
    ? registry.getTokenDefinitions().filter((def) => def.matchInlineContent)
    : []

  // Pre-pass: handle the case where linkify (or other inline rules) splits a custom token
  // across multiple tokens (e.g., a URL inside image{...}image gets turned into a link).
  // Only applies when non-text tokens are present (indicating linkify/inline-rule splitting).
  const hasNonTextTokens =
    tokens.length > 1 &&
    tokens.some(
      (t) => t.type !== 'text' && t.type !== 'softbreak' && t.type !== 'hardbreak',
    )
  if (contentRegexDefs.length > 0 && hasNonTextTokens) {
    const fullText = tokens.reduce((acc, t) => {
      if (t.type === 'text') return acc + (t.content ?? '')
      if (t.type === 'softbreak' || t.type === 'hardbreak') return acc + '\n'
      return acc
    }, '')

    // Check if any contentRegex matches exist in the reconstructed text
    const hasAnyMatch = contentRegexDefs.some((def) => def.matchInlineContent!(fullText)?.data?.match != null)

    if (hasAnyMatch) {
      // Flatten to a single synthetic text token and re-process.
      // This lets the regular full/partial match logic handle it correctly,
      // regardless of whether the match spans the whole text or only part of it.
      const syntheticToken: RawToken = {
        type: 'text',
        tag: '',
        nesting: 0,
        content: fullText,
        attrs: null,
        map: null,
        children: null,
        meta: null,
      }
      return buildInlineChildren([syntheticToken], parentPath, registry)
    }
  }

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

    // Try contentRegex match for custom inline tokens (e.g., pink...pink)
    if (token.type === 'text' && contentRegexDefs.length > 0) {
      const content = token.content

      // Check if it's a full match (starting at index 0 AND consuming entire content)
      let fullMatch = false
      let fullMatchDef: TokenTypeDefinition | undefined
      let fullMatchResult: any

      for (const def of contentRegexDefs) {
        const matchResult = def.matchInlineContent!(content)
        const match = matchResult?.data?.match as RegExpExecArray | undefined
        // Only treat as full match if it starts at 0 AND consumes entire content
        if (matchResult && match && match.index === 0 && match[0].length === content.length) {
          fullMatch = true
          fullMatchDef = def
          fullMatchResult = matchResult
          break
        }
      }

      // If full match, handle it directly
      if (fullMatch && fullMatchDef && fullMatchResult) {
        const tokenName = fullMatchDef.name
        typeCount[tokenName] = (typeCount[tokenName] ?? 0) + 1
        const id = generateId(tokenName, parentPath, typeCount[tokenName] - 1)

        const buildCtx = {
          matchResult: fullMatchResult,
          tokens,
          index: i,
          path: parentPath,
          buildChildren: (innerTokens: RawToken[], innerPath: string[]) =>
            buildInlineChildren(innerTokens, innerPath, registry),
        }

        const partial = fullMatchDef.build(buildCtx)
        const statefulToken: StatefulToken = {
          id,
          state: 'done',
          ...partial,
        }

        result.push(statefulToken)
        i++
        continue
      }

      // If not a full match, try to split the text token into multiple parts
      if (!fullMatch && contentRegexDefs.length > 0) {
        let remainingContent = content
        let hasPartialMatch = false
        const parts: { text: string; isMatch: boolean; def?: TokenTypeDefinition; matchResult?: any }[] = []

        while (remainingContent.length > 0) {
          let bestMatch: { def: TokenTypeDefinition; matchResult: any; match: RegExpExecArray } | null = null

          for (const def of contentRegexDefs) {
            const matchResult = def.matchInlineContent!(remainingContent)
            if (matchResult && matchResult.data?.match) {
              bestMatch = { def, matchResult, match: matchResult.data.match as RegExpExecArray }
              break
            }
          }

          if (bestMatch) {
            // Check if there's text before the match
            const matchIndex = bestMatch.match.index
            if (matchIndex > 0) {
              parts.push({
                text: remainingContent.slice(0, matchIndex),
                isMatch: false,
              })
            }

            // Add the matched part
            parts.push({
              text: remainingContent.slice(matchIndex, matchIndex + bestMatch.match[0].length),
              isMatch: true,
              def: bestMatch.def,
              matchResult: bestMatch.matchResult,
            })

            // Move past the prefix text and the matched text
            remainingContent = remainingContent.slice(matchIndex + bestMatch.match[0].length)
            hasPartialMatch = true
          } else {
            // No more matches, add remaining text
            parts.push({
              text: remainingContent,
              isMatch: false,
            })
            break
          }
        }

        // Process all parts
        if (hasPartialMatch) {
          for (const part of parts) {
            if (part.isMatch && part.def && part.matchResult) {
              const tokenName = part.def.name
              typeCount[tokenName] = (typeCount[tokenName] ?? 0) + 1
              const id = generateId(tokenName, parentPath, typeCount[tokenName] - 1)

              const buildCtx = {
                matchResult: part.matchResult,
                tokens,
                index: i,
                path: parentPath,
                buildChildren: (innerTokens: RawToken[], innerPath: string[]) =>
                  buildInlineChildren(innerTokens, innerPath, registry),
              }

              const partial = part.def.build(buildCtx)
              const statefulToken: StatefulToken = {
                id,
                state: 'done',
                ...partial,
              }
              result.push(statefulToken)
            } else if (part.text.length > 0) {
              // Add plain text part
              typeCount['text'] = (typeCount['text'] ?? 0) + 1
              const id = generateId('text', parentPath, typeCount['text'] - 1)
              result.push({
                id,
                type: 'text',
                state: 'done',
                content: part.text,
              })
            }
          }
          i++
          continue
        }
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
        meta: token.attrs ? { ...token.attrs } : undefined,
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

      // Handle inline tokens (with children from markdown-it) — flatten directly into parent
      if (token.type === 'inline') {
        const inlineChildren = token.children ?? []
        const inlineStateful = buildInlineChildren(inlineChildren, path, this.registry)
        result.push(...inlineStateful)
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
