export type { TokenState } from './token.js'

export interface SessionState {
  buffer: string
  tokenCount: number
  isComplete: boolean
}
