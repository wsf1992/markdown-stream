import type { ComponentType } from 'react'
import { createElement } from 'react'
import { defineTokenType } from '@markdown-stream/core'
import type { TokenTypeDefinition, StatefulToken } from '@markdown-stream/core'
import type { CustomTokenDefinition, TokenComponentProps } from '../types/renderer.js'

function toHandlerKey(eventName: string): string {
  const normalized = eventName.replace(/(^|[-_:])(\w)/g, (_match, _prefix, ch: string) => ch.toUpperCase())
  return `on${normalized}`
}

/**
 * 将 CustomTokenDefinition 包装为单个渲染组件。
 *
 * component 统一处理所有 state（streaming / done），用户在组件内部自行判断 token.state。
 */
export function makeStateRouter(def: CustomTokenDefinition): ComponentType<TokenComponentProps> {
  const Comp = def.component
  const extraProps = def.props ?? {}

  // 将 on: { copy: fn } 转换为 React 期望的 onCopy 格式
  const onHandlers: Record<string, unknown> = {}
  if (def.on) {
    for (const [key, fn] of Object.entries(def.on)) {
      onHandlers[toHandlerKey(key)] = fn
    }
  }

  if (!Comp) {
    const NullRenderer = (_props: TokenComponentProps) => null
    NullRenderer.displayName = `TokenRenderer_${def.name}`
    return NullRenderer
  }

  // Re-assign to a new const so TypeScript can narrow the type inside the closure
  const ResolvedComp = Comp
  function TokenStateRouter({ token }: TokenComponentProps) {
    return createElement(ResolvedComp, { token, ...extraProps, ...onHandlers } as TokenComponentProps & Record<string, unknown>)
  }
  TokenStateRouter.displayName = `TokenRenderer_${def.name}`
  return TokenStateRouter
}

function toRegex(r: string | RegExp): RegExp {
  return typeof r === 'string' ? new RegExp(r) : r
}

/**
 * 从 CustomTokenDefinition 自动生成 core 的 TokenTypeDefinition。
 *
 * - 无 closeRegex 且无 contentRegex：匹配 fence token 的 info 字段
 * - 有 closeRegex：匹配 open/close token 对
 * - 有 contentRegex：匹配 inline token 的内容
 */
export function buildTokenType(def: CustomTokenDefinition): TokenTypeDefinition {
  const { name, openRegex, closeRegex, contentRegex } = def

  // ContentRegex 模式：匹配 inline token 的内容
  if (contentRegex && !openRegex) {
    const contentRe = toRegex(contentRegex)
    const inlineContentRe = new RegExp(
      contentRe.source.replace(/^\^/, '').replace(/\$$/, ''),
      contentRe.flags
    )
    return defineTokenType({
      name,
      match(ctx) {
        const token = ctx.tokens[ctx.index]
        if (token.type !== 'inline') return false

        const children = token.children
        if (!children || children.length === 0) return false

        const firstChild = children[0]
        if (firstChild.type !== 'text') return false

        const content = firstChild.content
        const match = contentRe.exec(content)
        if (!match) return false

        return { consumed: 1, data: { match, content } }
      },
      matchInlineContent(content: string): { consumed: number; data: { match: RegExpExecArray; content: string } } | null {
        const match = inlineContentRe.exec(content)
        if (!match) return null
        return { consumed: 1, data: { match, content } }
      },
      build(ctx) {
        const token = ctx.tokens[ctx.index]
        const matchResult = ctx.matchResult
        const originalContent: string =
          typeof matchResult.data?.content === 'string' ? matchResult.data.content : ''
        const match: RegExpExecArray | null = Array.isArray(matchResult.data?.match)
          ? (matchResult.data.match as RegExpExecArray)
          : null

        const extractedContent = match != null && match[1] !== undefined ? match[1] : originalContent

        const extractedTextToken = {
          type: 'text',
          tag: '',
          nesting: 0 as const,
          content: extractedContent,
          attrs: null,
          map: null,
          children: null,
          meta: null,
        }

        return {
          type: name,
          content: extractedContent,
          children: ctx.buildChildren([extractedTextToken], [...ctx.path, name]),
          meta: { ...(token.meta ?? {}), originalContent },
        }
      },
    })
  }

  const open = toRegex(openRegex!)

  if (!closeRegex) {
    // Fence 模式：```<info> ... ```
    return defineTokenType({
      name,
      match(ctx) {
        const token = ctx.tokens[ctx.index]
        if (token.type === 'fence') {
          const info = (token.meta?.info as string) ?? ''
          if (open.test(info)) return { consumed: 1 }
        }
        return false
      },
      build(ctx) {
        const token = ctx.tokens[ctx.index]
        return {
          type: name,
          content: token.content,
          meta: { ...(token.meta ?? {}) },
        }
      },
    })
  }

  // Open/Close 模式：<open_type> ... <close_type>
  const close = toRegex(closeRegex)
  return defineTokenType({
    name,
    match(ctx) {
      const token = ctx.tokens[ctx.index]
      if (!open.test(token.type)) return false
      let i = ctx.index + 1
      while (i < ctx.tokens.length) {
        if (close.test(ctx.tokens[i].type)) break
        i++
      }
      return { consumed: i - ctx.index + 1 }
    },
    build(ctx) {
      const openToken = ctx.tokens[ctx.index]
      const inner = ctx.tokens.slice(
        ctx.index + 1,
        ctx.index + ctx.matchResult.consumed - 1
      )
      return {
        type: name,
        children: ctx.buildChildren(inner, [...ctx.path, name]),
        meta: { ...(openToken.meta ?? {}) },
      }
    },
  })
}

/**
 * 从 components 数组中提取需要自动生成的 TokenTypeDefinition 列表。
 */
export function extractTokenTypes(
  components: CustomTokenDefinition[]
): TokenTypeDefinition[] {
  return components
    .filter((d) => d.openRegex !== undefined || d.contentRegex !== undefined)
    .map(buildTokenType)
}

/**
 * 从 components 数组或旧格式对象中提取 { name → Component } 映射。
 */
export function extractComponentMap(
  components: CustomTokenDefinition[] | Record<string, unknown>
): Record<string, ComponentType<{ token: StatefulToken }>> {
  if (Array.isArray(components)) {
    return Object.fromEntries(components.map((d) => [d.name, makeStateRouter(d)]))
  }
  return components as Record<string, ComponentType<{ token: StatefulToken }>>
}
