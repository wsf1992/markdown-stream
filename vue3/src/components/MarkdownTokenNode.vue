<script lang="ts">
import { defineComponent, h, inject, isRef } from 'vue'
import type { VNode, ComputedRef } from 'vue'
import type { StatefulToken } from '@markdown-stream/core'
import { defaultRenderers, registerMarkdownTokenNode } from '../renderers/default-renderers.js'
import type { MarkdownTokenComponentMap } from '../types/renderer.js'

export const COMPONENTS_INJECT_KEY = Symbol('markdownComponents')

type ComponentsProvide =
  | ComputedRef<Partial<MarkdownTokenComponentMap>>
  | Partial<MarkdownTokenComponentMap>

const MarkdownTokenNode = defineComponent({
  name: 'MarkdownTokenNode',
  props: {
    token: {
      type: Object as () => StatefulToken,
      required: true,
    },
  },
  setup(props): () => VNode | VNode[] | string | null {
    const customComponents = inject<ComponentsProvide>(COMPONENTS_INJECT_KEY)

    return (): VNode | VNode[] | string | null => {
      const { token } = props
      const map = isRef(customComponents) ? customComponents.value : customComponents
      const comp =
        (map && map[token.type]) ??
        defaultRenderers[token.type]

      if (!comp) {
        if (token.children?.length) {
          return token.children.map((child) =>
            h(MarkdownTokenNode, { key: child.id, token: child })
          )
        }
        return token.content ?? null
      }

      return h(comp, { token })
    }
  },
})

// Break circular dependency: tell default-renderers about this component
registerMarkdownTokenNode(MarkdownTokenNode)

export default MarkdownTokenNode
</script>
