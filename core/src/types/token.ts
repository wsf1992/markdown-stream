export interface RawToken {
  type: string
  tag: string
  nesting: 1 | 0 | -1
  content: string
  attrs: Record<string, string> | null
  map: [number, number] | null
  children: RawToken[] | null
  meta: Record<string, unknown> | null
}

export type TokenState = 'start' | 'streaming' | 'done'

export interface StatefulToken {
  id: string
  type: string
  state: TokenState
  content?: string
  children?: StatefulToken[]
  meta?: Record<string, unknown>
  range?: { start: number; end: number }
  raw?: RawToken
}
