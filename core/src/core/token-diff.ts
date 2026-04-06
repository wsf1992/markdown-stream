import type { StatefulToken } from '../types/token.js'

/**
 * 将流式计时字段合并进 token meta：
 * - streamStartTime：token 首次出现时记录，后续更新中从 prevMeta 继承
 * - streamDoneTime：token 转为 done 状态时记录
 */
function mergeTimingMeta(
  tokenMeta: Record<string, unknown> | undefined,
  prevMeta: Record<string, unknown> | undefined,
  isNew: boolean,
  isDone: boolean,
): Record<string, unknown> {
  const streamStartTime: number = isNew
    ? Date.now()
    : (prevMeta?.streamStartTime as number | undefined) ?? Date.now()
  const result: Record<string, unknown> = { ...(tokenMeta ?? {}), streamStartTime }
  if (isDone) result.streamDoneTime = Date.now()
  return result
}

/** diffTokens 自身注入的计时字段，不参与内容相等性判断 */
const TIMING_META_KEYS: ReadonlySet<string> = new Set(['streamStartTime', 'streamDoneTime'])

function stripTimingMeta(meta: Record<string, unknown> | undefined): Record<string, unknown> | null {
  if (!meta) return null
  const result: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(meta)) {
    if (!TIMING_META_KEYS.has(k)) result[k] = v
  }
  return Object.keys(result).length > 0 ? result : null
}

function tokensContentEqual(a: StatefulToken, b: StatefulToken): boolean {
  if (a.content !== b.content) return false
  if (a.type !== b.type) return false

  // Compare meta，排除计时字段（计时字段只存在于 prevToken，nextToken 由 assembler 生成时没有）
  const aMeta = JSON.stringify(stripTimingMeta(a.meta))
  const bMeta = JSON.stringify(stripTimingMeta(b.meta))
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
  state: StatefulToken['state'],
  prevTokens?: StatefulToken[]
): StatefulToken[] {
  const prevById = new Map<string, StatefulToken>()
  if (prevTokens) {
    for (const p of prevTokens) prevById.set(p.id, p)
  }
  return tokens.map((t) => {
    const prev = prevById.get(t.id)
    return {
      ...t,
      state,
      children: t.children ? applyStatesToTree(t.children, state, prev?.children) : undefined,
    }
  })
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
        meta: mergeTimingMeta(nextToken.meta, prevToken?.meta, !prevToken, true),
        state: 'done',
        children: nextToken.children
          ? applyStatesToTree(nextToken.children, 'done', prevToken?.children)
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
        meta: mergeTimingMeta(nextToken.meta, undefined, true, state === 'done'),
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
        meta: mergeTimingMeta(nextToken.meta, prevToken.meta, false, state === 'done'),
        state,
        children: nextToken.children
          ? applyStatesToTree(nextToken.children, state, prevToken.children)
          : undefined,
      })
    } else {
      // Unchanged - but we need to check if it should transition to 'done'
      // A non-last token that was previously 'streaming' or 'start' should become 'done'
      if (!isLast && prevToken.state !== 'done') {
        result.push({
          ...nextToken,
          meta: mergeTimingMeta(nextToken.meta, prevToken.meta, false, true),
          state: 'done',
          children: nextToken.children
            ? applyStatesToTree(nextToken.children, 'done', prevToken.children)
            : undefined,
        })
      }
      // Otherwise skip (no change)
    }
  }

  return result
}
