import { defineComponent, h, markRaw, toRaw } from 'vue'
import type { Component, VNode } from 'vue'
import { defineTokenType } from '@markdown-stream/core'
import type { TokenTypeDefinition, StatefulToken } from '@markdown-stream/core'
import type { CustomTokenDefinition } from '../types/renderer.js'

// toRaw + markRaw：无论用户是否包裹 markRaw，都能拿到可安全渲染的组件
function safeComp(c: Component | undefined): Component | undefined {
  return c ? markRaw(toRaw(c) as object as Component) : undefined
}

/**
 * 将 CustomTokenDefinition 中的 state 专属组件包装为单个状态路由组件。
 *
 * 优先级：state 专属（start / streaming / done）> component（兜底）> null（不渲染）
 *
 * 用户无需手动调用 markRaw()，直接传入组件对象即可。
 */
export function makeStateRouter(def: CustomTokenDefinition): ReturnType<typeof defineComponent> {
  // 在 setup 阶段一次性提取并 markRaw，避免每次 render 都调 toRaw
  const startComp = safeComp(def.start)
  const streamingComp = safeComp(def.streaming)
  const doneComp = safeComp(def.done)
  const fallbackComp = safeComp(def.component)

  return markRaw(
    defineComponent({
      name: `StateRouter_${def.name}`,
      props: {
        token: { type: Object as () => StatefulToken, required: true },
      },
      setup(props) {
        return (): VNode | null => {
          const state = props.token.state as 'start' | 'streaming' | 'done'
          const comp =
            (state === 'start' ? startComp : state === 'streaming' ? streamingComp : doneComp)
            ?? fallbackComp
          if (!comp) return null
          return h(comp, { token: props.token })
        }
      },
    })
  )
}

function toRegex(r: string | RegExp): RegExp {
  return typeof r === 'string' ? new RegExp(r) : r
}

/**
 * 从 CustomTokenDefinition 自动生成 core 的 TokenTypeDefinition。
 *
 * - 无 closeRegex：匹配 fence token 的 info 字段（openRegex 与 info 比对）
 * - 有 closeRegex：匹配 open/close token 对（openRegex 与 token.type 比对）
 */
export function buildTokenType(def: CustomTokenDefinition): TokenTypeDefinition {
  const { name, openRegex, closeRegex } = def
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
    .filter((d) => d.openRegex !== undefined)
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
