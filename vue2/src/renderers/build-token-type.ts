import { defineComponent, h } from 'vue'
import type { Component, PropType } from 'vue'
import { defineTokenType } from '@markdown-stream/core'
import type { TokenTypeDefinition, StatefulToken } from '@markdown-stream/core'
import type { CustomTokenDefinition } from '../types/renderer.js'

/**
 * 将 CustomTokenDefinition 包装为单个渲染组件（Vue 2 版本）。
 *
 * Vue 2 中事件处理器通过 on:{} 传递，props 通过 props:{} 传递。
 * 无需 markRaw/toRaw（Vue 2 响应式系统不使用 Proxy）。
 */
export function makeStateRouter(def: CustomTokenDefinition): Component {
  const comp = def.component as Component | undefined
  const extraProps = def.props ?? {}
  // Vue 2: events go in on:{} without 'on' prefix (e.g. { copy: fn } not { onCopy: fn })
  const onHandlers = def.on ?? {}

  return defineComponent({
    name: `TokenRenderer_${def.name}`,
    props: {
      token: { type: Object as PropType<StatefulToken>, required: true as const },
    },
    setup(props) {
      return () => {
        if (!comp) return h('span')
        return h(comp, {
          props: { token: props.token, ...extraProps },
          on: onHandlers,
        })
      }
    },
  })
}

function toRegex(r: string | RegExp): RegExp {
  return typeof r === 'string' ? new RegExp(r) : r
}

/**
 * 从 CustomTokenDefinition 自动生成 core 的 TokenTypeDefinition。
 *
 * - 无 closeRegex 且无 contentRegex：匹配 fence token 的 info 字段（openRegex 与 info 比对）
 * - 有 closeRegex：匹配 open/close token 对（openRegex 与 token.type 比对）
 * - 有 contentRegex：匹配 inline token 的内容（与 inline 子 token 的 content 比对）
 */
export function buildTokenType(def: CustomTokenDefinition): TokenTypeDefinition {
  const { name, openRegex, closeRegex, contentRegex } = def

  // ContentRegex 模式：匹配 inline token 的内容
  if (contentRegex && !openRegex) {
    const contentRe = toRegex(contentRegex)
    // 用于行内局部匹配：去除 ^ 和 $ 锚点，使其能匹配文本中间的片段
    const inlineContentRe = new RegExp(
      contentRe.source.replace(/^\^/, '').replace(/\$$/, ''),
      contentRe.flags
    )
    return defineTokenType({
      name,
      match(ctx) {
        const token = ctx.tokens[ctx.index]
        // 匹配 inline token
        if (token.type !== 'inline') return false

        // 获取 inline 的子 token
        const children = token.children
        if (!children || children.length === 0) return false

        // 检查第一个子 token 的内容是否符合正则
        const firstChild = children[0]
        if (firstChild.type !== 'text') return false

        const content = firstChild.content
        const match = contentRe.exec(content)
        if (!match) return false

        // 保存捕获组到 matchResult，用于 build 阶段提取内容
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
        const originalContent = matchResult.data?.content as string
        const match = matchResult.data?.match as RegExpExecArray

        // 提取捕获的内容
        const extractedContent = match && match[1] !== undefined ? match[1] : originalContent

        // 构建子 token：使用提取后的内容作为 text token
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
 * 数组格式的每一项统一包装为 StateRouter，支持 state 专属渲染。
 */
export function extractComponentMap(
  components: CustomTokenDefinition[] | Record<string, unknown>
): Record<string, unknown> {
  if (Array.isArray(components)) {
    return Object.fromEntries(components.map((d) => [d.name, makeStateRouter(d)]))
  }
  return components
}
