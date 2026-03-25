<script lang="ts">
import { defineComponent, h, inject, markRaw } from 'vue'
import type { VNode } from 'vue'
import type { StatefulToken } from '@markdown-stream/core'
import { defaultRenderers, registerMarkdownTokenNode } from '../renderers/default-renderers.js'
import type { MarkdownTokenComponentMap } from '../types/renderer.js'

export const COMPONENTS_INJECT_KEY = Symbol('markdownComponents')

const MarkdownTokenNode = defineComponent({
  name: 'MarkdownTokenNode',
  props: {
    token: {
      type: Object as () => StatefulToken,
      required: true,
    },
  },
  setup(props): () => VNode | VNode[] | string | null {
    const customComponents = inject<Partial<MarkdownTokenComponentMap>>(
      COMPONENTS_INJECT_KEY,
      {}
    )

    return (): VNode | VNode[] | string | null => {
      const { token } = props
      const raw =
        (customComponents && customComponents[token.type]) ??
        defaultRenderers[token.type]
      const comp = raw ? markRaw(raw) : undefined

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
