import type { TokenTypeDefinition } from '@markdown-stream/core'
import type { CustomTokenDefinition, MarkdownTokenComponentMap } from './renderer.js'

export interface MarkdownStreamProps {
  /** 统一入口：传入字符串时一次性渲染，传入 AsyncIterable 时流式渲染 */
  content?: string | AsyncIterable<string>
  source?: string
  stream?: AsyncIterable<string> | string
  tokenTypes?: TokenTypeDefinition[]
  /**
   * 自定义 token 定义数组（推荐）或渲染组件映射（兼容旧格式）。
   *
   * 数组格式：每项可携带 openRegex / closeRegex，自动生成解析逻辑 + 注册渲染组件。
   * 对象格式：仅覆盖已有 token 的渲染组件，不扩展解析逻辑。
   */
  components?: CustomTokenDefinition[] | Partial<MarkdownTokenComponentMap>
  /** 开启后在 console 打印每个 token 的状态变化（start / streaming / done） */
  debug?: boolean
  /** 流式输出时是否显示光标动画，默认为 false */
  cursor?: boolean
}
