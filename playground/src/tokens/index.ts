import { defineComponent, h, markRaw, type PropType } from 'vue'
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

export const tokenComponents = [
  { name: 'fence',      start: markRaw(CodeSkeleton),     streaming: markRaw(CodeStreaming), done: markRaw(CodeBlock) },
  { name: 'vue_sfc',    openRegex: /^ui$/,       start: markRaw(SfcRendererPending), streaming: markRaw(SfcRendererPending), done: markRaw(VueSfcFenceRenderer) },
  { name: 'vue_preview',openRegex: /^preview$/,  start: markRaw(PreviewRenderer),   streaming: markRaw(PreviewRenderer),   done: markRaw(PreviewRenderer) },
  { name: 'json',       openRegex: /^json$/,      start: markRaw(JsonBlock),         streaming: markRaw(JsonBlock),         done: markRaw(JsonBlock) },
  { name: 'callout-info',    openRegex: /^callout-info$/,    component: markRaw(CalloutBlock) },
  { name: 'callout-warning',openRegex: /^callout-warning$/, component: markRaw(CalloutBlock) },
  { name: 'callout-danger',  openRegex: /^callout-danger$/,  component: markRaw(CalloutBlock) },
  { name: 'pink_highlight', contentRegex: /^pink(.+)pink$/, component: markRaw(PinkHighlight) },
  { name: 'image', openRegex: /^image$/, component: markRaw(ImageToken) },
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
