import { defineComponent, h, type PropType } from 'vue'
import { MarkdownStream } from '@markdown-stream/vue3'
import type { VueSfcCardMetrics, VueSfcRenderSuccessPayload } from '@markdown-stream/vue3'
import PreviewRenderer from '../components/PreviewRenderer.vue'
import JsonBlock from '../components/JsonBlock.vue'
import PinkHighlight from '../components/PinkHighlight.vue'
import CodeFenceRenderer from '../components/CodeFenceRenderer.vue'
import VueSfcRenderer from '../components/VueSfcRenderer.vue'
import VueSfcShadowRendererWrapper from '../components/VueSfcShadowRendererWrapper.vue'
import CalloutBlock from '../components/CalloutBlock.vue'
import ImageToken from '../components/ImageToken.vue'
import LinkToken from '../components/LinkToken.vue'
import CitationLink from '../components/CitationLink.vue'

export interface TokenComponentsOptions {
  onSfcError?: (err: Error) => void
  sfcCardProps?: {
    metrics?: VueSfcCardMetrics
    onRenderSuccess?: (payload: VueSfcRenderSuccessPayload) => void
  }
}

export function createTokenComponents(options: TokenComponentsOptions = {}) {
  const {
    onSfcError = (err) => console.error('[sfc error]', err),
    sfcCardProps,
  } = options

  return [
    { name: 'fence',         component: CodeFenceRenderer },
    {
      name: 'vue_sfc',
      openRegex: /^ui$/,
      component: VueSfcRenderer,
      props: {
        metrics: sfcCardProps?.metrics,
        onError: onSfcError,
      },
      on: sfcCardProps?.onRenderSuccess
        ? { 'render-success': sfcCardProps.onRenderSuccess }
        : undefined,
    },
    { name: 'vue_sfc_shadow', openRegex: /^ui-shadow$/, component: VueSfcShadowRendererWrapper },
    { name: 'vue_preview',    openRegex: /^preview$/,   component: PreviewRenderer },
    { name: 'json',           openRegex: /^json$/,      component: JsonBlock },
    { name: 'callout-info',    openRegex: /^callout-info$/,    component: CalloutBlock },
    { name: 'callout-warning', openRegex: /^callout-warning$/, component: CalloutBlock },
    { name: 'callout-danger',  openRegex: /^callout-danger$/,  component: CalloutBlock },
    { name: 'pink_highlight', contentRegex: /^pink(.+)pink$/, component: PinkHighlight },
    { name: 'image',          contentRegex: /^image(.+)image$/, component: ImageToken },
    { name: 'ext_link',       contentRegex: /^link(.+)link$/, component: LinkToken },
    { name: 'link',           component: CitationLink },
  ]
}

// 默认实例，无自定义错误处理时直接用
export const tokenComponents = createTokenComponents()

// 包装 MarkdownStream，预注册所有自定义 token
export const MarkdownWithTokens = defineComponent({
  name: 'MarkdownWithTokens',
  props: {
    content: { type: [String, Object] as PropType<string | AsyncIterable<string>>, default: undefined },
    debug: { type: Boolean, default: false },
    sfcCardProps: {
      type: Object as PropType<TokenComponentsOptions['sfcCardProps']>,
      default: undefined,
    },
  },
  setup(props) {
    const components = createTokenComponents({
      onSfcError: (err) => console.error('[MarkdownWithTokens sfc error]', err),
      sfcCardProps: props.sfcCardProps,
    })
    return () =>
      h(MarkdownStream, {
        content: props.content,
        components,
        debug: props.debug,
      })
  },
})
