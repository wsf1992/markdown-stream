import { defineComponent, h, type PropType } from 'vue'
import { MarkdownStream } from '@markdown-stream/vue3'
import { VueSfcFenceRenderer, SfcRendererPending } from '@markdown-stream/vue3'
import PreviewRenderer from '../components/PreviewRenderer.vue'
import JsonBlock from '../components/JsonBlock.vue'
import PinkHighlight from '../components/PinkHighlight.vue'
import CodeSkeleton from '../components/CodeSkeleton.vue'
import CodeStreaming from '../components/CodeStreaming.vue'
import CodeBlock from '../components/CodeBlock.vue'
import CalloutBlock from '../components/CalloutBlock.vue'
import ImageToken from '../components/ImageToken.vue'
import LinkToken from '../components/LinkToken.vue'

export const tokenComponents = [
  { name: 'fence',      start: CodeSkeleton,     streaming: CodeStreaming, done: CodeBlock },
  { name: 'vue_sfc',    openRegex: /^ui$/,       start: SfcRendererPending, streaming: SfcRendererPending, done: VueSfcFenceRenderer },
  { name: 'vue_preview',openRegex: /^preview$/,  start: PreviewRenderer,   streaming: PreviewRenderer,   done: PreviewRenderer },
  { name: 'json',       openRegex: /^json$/,      start: JsonBlock,         streaming: JsonBlock,         done: JsonBlock },
  { name: 'callout-info',    openRegex: /^callout-info$/,    component: CalloutBlock },
  { name: 'callout-warning',openRegex: /^callout-warning$/, component: CalloutBlock },
  { name: 'callout-danger',  openRegex: /^callout-danger$/,  component: CalloutBlock },
  { name: 'pink_highlight', contentRegex: /^pink(.+)pink$/, component: PinkHighlight },
  { name: 'image', contentRegex: /^image(.+)image$/, component: ImageToken },
  { name: 'ext_link', contentRegex: /^link(.+)link$/, component: LinkToken },
]

// 包装 MarkdownStream，预注册所有自定义 token
export const MarkdownWithTokens = defineComponent({
  name: 'MarkdownWithTokens',
  props: {
    content: { type: [String, Object] as PropType<string | AsyncIterable<string>>, default: undefined },
    debug: { type: Boolean, default: false },
  },
  setup(props) {
    return () =>
      h(MarkdownStream, {
        content: props.content,
        components: tokenComponents,
        debug: props.debug,
      })
  },
})
