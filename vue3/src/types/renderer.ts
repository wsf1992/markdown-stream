import type { Component } from 'vue'
import type { StatefulToken } from '@markdown-stream/core'

export interface TokenComponentProps {
  token: StatefulToken
}

/**
 * 单条自定义 token 定义。
 *
 * 只传 name + component        → 三种状态统一用 component 渲染，token.state 在组件内部自行处理。
 * 额外传 openRegex             → 自动注册 TokenTypeDefinition，匹配 fence info 字段。
 * 额外传 openRegex + closeRegex → 自动注册 TokenTypeDefinition，匹配 open/close token 对。
 */
export interface CustomTokenDefinition {
  /** token 类型名，同时作为组件映射 key */
  name: string
  /**
   * 兜底渲染组件，当没有匹配的 state 专属组件时使用。
   * token.state 在组件内部自行处理，建议 markRaw() 包裹。
   */
  component?: Component
  /**
   * state=done 时使用的专属渲染组件，优先于 component。
   */
  done?: Component
  /**
   * state=streaming 时使用的专属渲染组件，优先于 component。
   * 若未定义则该 state 下不渲染（返回 null）。
   */
  streaming?: Component
  /**
   * state=start 时使用的专属渲染组件，优先于 component。
   * 若未定义则该 state 下不渲染（返回 null）。
   */
  start?: Component
  /** 额外传递给渲染组件的 props（与 token 合并，不会覆盖 token） */
  props?: Record<string, unknown>
  /** 监听渲染组件 emit 的事件处理器，key 格式同 Vue h() 的 onXxx */
  on?: Record<string, (...args: unknown[]) => void>
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
