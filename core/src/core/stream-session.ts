import type { StatefulToken } from '../types/token.js'
import { MarkdownItAdapter } from '../parser/markdown-it-adapter.js'
import { TokenAssembler } from './token-assembler.js'
import { TokenRegistry } from './token-registry.js'
import type { TokenTypeDefinition } from './token-registry.js'
import { diffTokens } from './token-diff.js'

export class StreamSession {
  private buffer: string = ''
  private prevTokens: StatefulToken[] = []
  private registry: TokenRegistry
  private adapter: MarkdownItAdapter
  private assembler: TokenAssembler
  // Full snapshot of current token tree
  private snapshot_: StatefulToken[] = []

  constructor(registry?: TokenRegistry) {
    this.registry = registry ?? new TokenRegistry()
    this.adapter = new MarkdownItAdapter()
    this.assembler = new TokenAssembler(this.registry)
  }

  use(def: TokenTypeDefinition): this {
    this.registry.register(def)
    // Rebuild assembler with updated registry
    this.assembler = new TokenAssembler(this.registry)
    return this
  }

  write(chunk: string): StatefulToken[] {
    this.buffer += chunk
    const rawTokens = this.adapter.parse(this.buffer)
    const nextTokens = this.assembler.assemble(rawTokens)

    const diff = diffTokens(this.prevTokens, nextTokens, false)

    // Update snapshot: merge diff into current snapshot
    this.snapshot_ = this.mergeSnapshot(this.snapshot_, nextTokens, diff)

    // Update prevTokens with the full next state (with states applied)
    this.prevTokens = this.applyDiffToPrev(this.prevTokens, nextTokens, diff)

    return diff
  }

  parse(markdown: string): StatefulToken[] {
    const rawTokens = this.adapter.parse(markdown)
    const nextTokens = this.assembler.assemble(rawTokens)
    const result = diffTokens([], nextTokens, true)

    // Update internal state
    this.buffer = markdown
    this.snapshot_ = result
    this.prevTokens = result

    return result
  }

  snapshot(): StatefulToken[] {
    return this.snapshot_
  }

  reset(): void {
    this.buffer = ''
    this.prevTokens = []
    this.snapshot_ = []
  }

  private applyDiffToPrev(
    prev: StatefulToken[],
    next: StatefulToken[],
    diff: StatefulToken[]
  ): StatefulToken[] {
    // Build a map of diff tokens by id
    const diffById = new Map<string, StatefulToken>()
    for (const t of diff) {
      diffById.set(t.id, t)
    }

    // For each token in next, use diff version if exists, otherwise use prev with state preserved
    const prevById = new Map<string, StatefulToken>()
    for (const t of prev) {
      prevById.set(t.id, t)
    }

    return next.map((t) => {
      const diffToken = diffById.get(t.id)
      if (diffToken) return diffToken
      // Not in diff - use prev state if exists
      const prevToken = prevById.get(t.id)
      if (prevToken) return prevToken
      return { ...t, state: 'done' as const }
    })
  }

  private mergeSnapshot(
    current: StatefulToken[],
    next: StatefulToken[],
    diff: StatefulToken[]
  ): StatefulToken[] {
    const diffById = new Map<string, StatefulToken>()
    for (const t of diff) {
      diffById.set(t.id, t)
    }

    const currentById = new Map<string, StatefulToken>()
    for (const t of current) {
      currentById.set(t.id, t)
    }

    // Build snapshot from next tokens, applying diff states where available
    return next.map((t) => {
      const diffToken = diffById.get(t.id)
      if (diffToken) return diffToken
      const currentToken = currentById.get(t.id)
      if (currentToken) return currentToken
      return { ...t, state: 'done' as const }
    })
  }
}
