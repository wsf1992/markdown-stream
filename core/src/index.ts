export type { StatefulToken, TokenState } from './types/token.js'
export type {
  TokenMatchContext,
  TokenMatchResult,
  TokenBuildContext,
  FinalizeContext,
  TokenTypeDefinition,
} from './core/token-registry.js'

import type { StatefulToken } from './types/token.js'
import type { TokenTypeDefinition } from './core/token-registry.js'
import { TokenRegistry } from './core/token-registry.js'
import { StreamSession } from './core/stream-session.js'

export interface MarkdownProcessorOptions {
  tokenTypes?: TokenTypeDefinition[]
}

export interface MarkdownProcessor {
  parse(markdown: string): StatefulToken[]
  write(chunk: string): StatefulToken[]
  flush(): StatefulToken[]
  snapshot(): StatefulToken[]
  reset(): void
  use(tokenType: TokenTypeDefinition): MarkdownProcessor
}

export function defineTokenType(def: TokenTypeDefinition): TokenTypeDefinition {
  return def
}

export function createMarkdownProcessor(
  options?: MarkdownProcessorOptions
): MarkdownProcessor {
  const registry = new TokenRegistry()
  if (options?.tokenTypes) {
    for (const def of options.tokenTypes) {
      registry.register(def)
    }
  }

  const session = new StreamSession(registry)

  const processor: MarkdownProcessor = {
    parse(markdown: string): StatefulToken[] {
      return session.parse(markdown)
    },
    write(chunk: string): StatefulToken[] {
      return session.write(chunk)
    },
    snapshot(): StatefulToken[] {
      return session.snapshot()
    },
    reset(): void {
      session.reset()
    },
    flush(): StatefulToken[] {
      return session.flush()
    },
    use(tokenType: TokenTypeDefinition): MarkdownProcessor {
      session.use(tokenType)
      return processor
    },
  }

  return processor
}
