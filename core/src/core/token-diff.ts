import type { StatefulToken } from '../types/token.js'

function tokensContentEqual(a: StatefulToken, b: StatefulToken): boolean {
  if (a.content !== b.content) return false
  if (a.type !== b.type) return false

  // Compare meta
  const aMeta = JSON.stringify(a.meta ?? null)
  const bMeta = JSON.stringify(b.meta ?? null)
  if (aMeta !== bMeta) return false

  // Compare children
  if ((a.children == null) !== (b.children == null)) return false
  if (a.children && b.children) {
    if (a.children.length !== b.children.length) return false
    for (let i = 0; i < a.children.length; i++) {
      if (!tokensContentEqual(a.children[i], b.children[i])) return false
    }
  }

  return true
}

function applyStatesToTree(
  tokens: StatefulToken[],
  state: StatefulToken['state']
): StatefulToken[] {
  return tokens.map((t) => ({
    ...t,
    state,
    children: t.children ? applyStatesToTree(t.children, state) : undefined,
  }))
}

export function diffTokens(
  prev: StatefulToken[],
  next: StatefulToken[],
  isLastChunk: boolean
): StatefulToken[] {
  const result: StatefulToken[] = []

  // Build lookup by id for prev tokens
  const prevById = new Map<string, StatefulToken>()
  for (const t of prev) {
    prevById.set(t.id, t)
  }

  for (let i = 0; i < next.length; i++) {
    const nextToken = next[i]
    const prevToken = prevById.get(nextToken.id)
    const isLast = i === next.length - 1

    if (isLastChunk) {
      // All tokens get state = 'done'
      result.push({
        ...nextToken,
        state: 'done',
        children: nextToken.children
          ? applyStatesToTree(nextToken.children, 'done')
          : undefined,
      })
      continue
    }

    if (!prevToken) {
      // New token:
      // - If last token in the list: 'streaming' (still potentially receiving content)
      // - If not last (other blocks follow): 'done' (the block is complete)
      // - Special case: if it's the only new token and is last, use 'start' only
      //   when transitioning from prev known state to indicate it just appeared.
      //   But per spec, non-last block → 'done', last block → 'streaming'
      const state = isLast ? 'streaming' : 'done'
      result.push({
        ...nextToken,
        state,
        children: nextToken.children
          ? applyStatesToTree(nextToken.children, state)
          : undefined,
      })
    } else if (!tokensContentEqual(prevToken, nextToken)) {
      // Changed token
      const state = isLast ? 'streaming' : 'done'
      result.push({
        ...nextToken,
        state,
        children: nextToken.children
          ? applyStatesToTree(nextToken.children, state)
          : undefined,
      })
    } else {
      // Unchanged - but we need to check if it should transition to 'done'
      // A non-last token that was previously 'streaming' or 'start' should become 'done'
      if (!isLast && prevToken.state !== 'done') {
        result.push({
          ...nextToken,
          state: 'done',
          children: nextToken.children
            ? applyStatesToTree(nextToken.children, 'done')
            : undefined,
        })
      }
      // Otherwise skip (no change)
    }
  }

  return result
}
