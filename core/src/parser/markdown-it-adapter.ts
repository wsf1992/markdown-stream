import MarkdownIt from 'markdown-it'
import type Token from 'markdown-it/lib/token.mjs'
import type { Options } from 'markdown-it'
import type { RawToken } from '../types/token.js'

type MdToken = Token

function convertToken(token: MdToken): RawToken {
  const attrs: Record<string, string> | null =
    token.attrs && token.attrs.length > 0
      ? Object.fromEntries(
          (token.attrs as Array<[string, string]>).map(
            ([k, v]: [string, string]) => [k, v]
          )
        )
      : null

  const children: RawToken[] | null =
    token.children && token.children.length > 0
      ? token.children.map(convertToken)
      : null

  const meta: Record<string, unknown> | null =
    token.info ? { info: token.info } : null

  return {
    type: token.type,
    tag: token.tag,
    nesting: token.nesting as 1 | 0 | -1,
    content: token.content,
    attrs,
    map: token.map as [number, number] | null,
    children,
    meta,
  }
}

export class MarkdownItAdapter {
  private md: MarkdownIt

  constructor(options?: Options) {
    this.md = new MarkdownIt({
      html: false,
      linkify: true,
      typographer: false,
      ...options,
    })
  }

  parse(markdown: string): RawToken[] {
    const tokens = this.md.parse(markdown, {})
    return tokens.map(convertToken)
  }
}
