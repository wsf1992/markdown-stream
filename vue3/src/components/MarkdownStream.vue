<script lang="ts">
import { defineComponent, h, provide, watch, markRaw, toRaw } from 'vue'
import type { PropType } from 'vue'
import type { TokenTypeDefinition } from '@markdown-stream/core'
import { useMarkdownStream } from '../composables/use-markdown-stream.js'
import MarkdownTokenNode, { COMPONENTS_INJECT_KEY } from './MarkdownTokenNode.vue'
import type { CustomTokenDefinition, MarkdownTokenComponentMap } from '../types/renderer.js'
import { extractTokenTypes, extractComponentMap } from '../renderers/build-token-type.js'

export default defineComponent({
  name: 'MarkdownStream',
  props: {
    content: {
      type: [Object, String] as PropType<string | AsyncIterable<string>>,
      default: undefined,
    },
    source: {
      type: String as PropType<string>,
      default: undefined,
    },
    stream: {
      type: [Object, String] as PropType<AsyncIterable<string> | string>,
      default: undefined,
    },
    tokenTypes: {
      type: Array as PropType<TokenTypeDefinition[]>,
      default: undefined,
    },
    components: {
      type: [Array, Object] as PropType<
        CustomTokenDefinition[] | Partial<MarkdownTokenComponentMap>
      >,
      default: undefined,
    },
    debug: {
      type: Boolean,
      default: false,
    },
    cursor: {
      type: Boolean,
      default: false,
    },
  },
  setup(props) {
    // 从 components 中提取自动生成的 tokenTypes（首次读取，不追踪后续变化）
    const autoTokenTypes = Array.isArray(props.components)
      ? extractTokenTypes(props.components)
      : []

    const { tokens, isStreaming, consume, parse, reset, cancel } = useMarkdownStream({
      tokenTypes: [...(props.tokenTypes ?? []), ...autoTokenTypes],
      debug: props.debug,
    })

    // 构建 name → Component 映射
    // 数组格式：makeStateRouter 内部已经处理了 toRaw + markRaw，直接使用
    // 旧对象格式：手动 markRaw 每个 Component
    function buildComponentMap(): Record<string, unknown> {
      if (!props.components) return {}
      if (Array.isArray(props.components)) {
        // extractComponentMap 内部调用 makeStateRouter，已处理响应式
        return extractComponentMap(props.components as CustomTokenDefinition[])
      }
      // 旧格式 Record<string, Component>：toRaw 拿到原始对象后 markRaw
      const safe: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(toRaw(props.components))) {
        if (v) safe[k] = markRaw(toRaw(v as object))
      }
      return safe
    }

    provide(COMPONENTS_INJECT_KEY, buildComponentMap())

    // Priority: content > source > stream
    watch(
      [() => props.content, () => props.source, () => props.stream],
      ([content, source, stream], prevVals) => {
        const value = content ?? source ?? stream
        if (value === undefined) return

        // Streaming → Static transition: cancel async loop, then parse final text.
        const prevValue = prevVals ? (prevVals[0] ?? prevVals[1] ?? prevVals[2]) : undefined
        const wasStreaming = prevValue != null && typeof prevValue !== 'string'
        if (wasStreaming && typeof value === 'string') {
          cancel()
          isStreaming.value = false
          parse(value)
          return
        }

        reset()
        if (typeof value === 'string') {
          parse(value)
        } else {
          consume(value)
        }
      },
      { immediate: true }
    )

    return () => {
      const children = tokens.value.map((token) =>
        h(MarkdownTokenNode, { key: token.id, token })
      )
      return h(
        'div',
        {
          class: 'ms-root',
          'data-streaming': isStreaming.value ? '' : undefined,
          'data-no-cursor': !props.cursor ? '' : undefined,
        },
        children
      )
    }
  },
})
</script>
