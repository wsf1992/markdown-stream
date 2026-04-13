import { MarkdownStream } from '@markdown-stream/react'
import type { MarkdownStreamProps } from '@markdown-stream/react'
import CodeFenceRenderer from './components/CodeFenceRenderer.js'
import JsonBlock from './components/JsonBlock.js'
import PinkHighlight from './components/PinkHighlight.js'
import CalloutBlock from './components/CalloutBlock.js'
import VueSfcRenderer from './components/VueSfcRenderer.js'

export const tokenComponents = [
  { name: 'fence',            component: CodeFenceRenderer },
  { name: 'json',             openRegex: /^json$/,            component: JsonBlock },
  { name: 'vue-sfc',          openRegex: /^ui$/,              component: VueSfcRenderer },
  { name: 'vue-sfc-shadow',   openRegex: /^ui-shadow$/,       component: VueSfcRenderer },
  { name: 'vue-sfc-preview',  openRegex: /^preview$/,         component: VueSfcRenderer },
  { name: 'callout-info',     openRegex: /^callout-info$/,    component: CalloutBlock },
  { name: 'callout-warning',  openRegex: /^callout-warning$/, component: CalloutBlock },
  { name: 'callout-danger',   openRegex: /^callout-danger$/,  component: CalloutBlock },
  { name: 'pink_highlight',   contentRegex: /^pink(.+)pink$/, component: PinkHighlight },
]

/** 预注册全部自定义 token 的 MarkdownStream 封装 */
export function MarkdownWithTokens(props: Omit<MarkdownStreamProps, 'components'>) {
  return <MarkdownStream {...props} components={tokenComponents} />
}
