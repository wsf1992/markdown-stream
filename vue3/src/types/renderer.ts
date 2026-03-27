import type { Component } from 'vue'
import type { StatefulToken } from '@markdown-stream/core'

export interface TokenComponentProps {
  token: StatefulToken
}

/**
 * 单条自定义 token 定义。
 *
 * 渲染组件优先级（高→低）：
 *   state 专属组件（start / streaming / done）> component（兜底）> 不渲染
 *
 * 只传 name + component        → 三种状态统一用 component 渲染。
 * 传 state 专属组件             → 仅在对应 state 渲染，其余 state 不展示（不传 = 不渲染）。
 * component 与 state 专属混用  → 未定义专属组件的 state 回退到 component。
 * 额外传 openRegex             → 自动注册 TokenTypeDefinition，匹配 fence info 字段。
 * 额外传 openRegex + closeRegex → 自动注册 TokenTypeDefinition，匹配 open/close token 对。
 */
export interface CustomTokenDefinition {
  /** token 类型名，同时作为组件映射 key */
  name: string
  /** 所有 state 的兜底渲染组件，建议 markRaw() 包裹 */
  component?: Component
  /** token.state === 'start' 时渲染；不定义则此 state 不渲染任何内容 */
  start?: Component
  /** token.state === 'streaming' 时渲染；不定义则此 state 不渲染任何内容 */
  streaming?: Component
  /** token.state === 'done' 时渲染；不定义则此 state 不渲染任何内容 */
  done?: Component
  /**
   * 无 closeRegex 时：与 fence token 的 info 字段匹配。
   * 有 closeRegex 时：与 raw token 的 type 字段匹配（open token）。
   */
  openRegex?: string | RegExp
  /**
   * 与 raw token 的 type 字段匹配（close token）。
   * 仅在 openRegex 也存在时生效。
   */
  closeRegex?: string | RegExp
  /**
   * 匹配 inline token 的内容（需要配合 closeRegex 或单独使用）。
   * 当 openRegex/closeRegex 不适用时，使用 contentRegex 匹配 inline 文本内容。
   * 例如：contentRegex: /^pink(.+)pink$/ 会匹配 "pink文本pink"
   */
  contentRegex?: string | RegExp
}

/** 兼容旧格式：直接传 Record<name, Component> 也可覆盖渲染 */
export type MarkdownTokenComponentMap = Record<string, Component>
