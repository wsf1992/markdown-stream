import type { TokenTypeDefinition } from '@markdown-stream/core'
import type { CustomTokenDefinition, MarkdownTokenComponentMap } from './renderer.js'

export interface MarkdownStreamProps {
  source?: string
  stream?: AsyncIterable<string>
  tokenTypes?: TokenTypeDefinition[]
  /**
   * 自定义 token 定义数组（推荐）或渲染组件映射（兼容旧格式）。
   *
   * 数组格式：每项可携带 openRegex / closeRegex，自动生成解析逻辑 + 注册渲染组件。
   * 对象格式：仅覆盖已有 token 的渲染组件，不扩展解析逻辑。
   */
  components?: CustomTokenDefinition[] | Partial<MarkdownTokenComponentMap>
}
