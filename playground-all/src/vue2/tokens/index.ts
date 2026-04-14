import { defineComponent, h } from 'vue'
import type { PropType } from 'vue'
import { MarkdownStream } from '@markdown-stream/vue2'
import CodeFenceRenderer from '../components/CodeFenceRenderer.vue'
import PinkHighlight from '../components/PinkHighlight.vue'
import CalloutBlock from '../components/CalloutBlock.vue'
import ImageToken from '../components/ImageToken.vue'
import LinkToken from '../components/LinkToken.vue'

export const tokenComponents = [
  { name: 'fence',            component: CodeFenceRenderer },
  { name: 'callout-info',     openRegex: /^callout-info$/,    component: CalloutBlock },
  { name: 'callout-warning',  openRegex: /^callout-warning$/, component: CalloutBlock },
  { name: 'callout-danger',   openRegex: /^callout-danger$/,  component: CalloutBlock },
  { name: 'pink_highlight',   contentRegex: /^pink(.+)pink$/, component: PinkHighlight },
  { name: 'image',            contentRegex: /^image(.+)image$/, component: ImageToken },
  { name: 'ext_link',         contentRegex: /^link(.+)link$/,   component: LinkToken },
]

// 包装 MarkdownStream，预注册所有自定义 token
export const MarkdownWithTokens = defineComponent({
  name: 'MarkdownWithTokens',
  props: {
    content: {
      type: [String, Object] as PropType<string | AsyncIterable<string>>,
      default: undefined,
    },
    debug: { type: Boolean, default: false },
  },
  setup(props) {
    return () =>
      // Vue 2 h(): component props go in props:{}
      h(MarkdownStream, {
        props: {
          content: props.content,
          components: tokenComponents,
          debug: props.debug,
        },
      })
  },
})
