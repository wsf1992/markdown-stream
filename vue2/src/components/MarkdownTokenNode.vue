<script lang="ts">
import { defineComponent, h, inject } from 'vue'
import type { PropType } from 'vue'
import type { StatefulToken } from '@markdown-stream/core'
import { defaultRenderers, registerMarkdownTokenNode } from '../renderers/default-renderers.js'
import type { MarkdownTokenComponentMap } from '../types/renderer.js'

export const COMPONENTS_INJECT_KEY = Symbol('markdownComponents')

// `as any` breaks the circular type inference: Vue 2.7's DefineComponent generics are
// invariant, so a specific DefineComponent<{token:...}> cannot be assigned to the
// generic DefineComponent<ComponentPropsOptions> returned by ReturnType<typeof defineComponent>.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MarkdownTokenNode: any = defineComponent({
  name: 'MarkdownTokenNode',
  props: {
    token: {
      type: Object as PropType<StatefulToken>,
      required: true,
    },
  },
  setup(props) {
    const customComponents = inject<Partial<MarkdownTokenComponentMap>>(
      COMPONENTS_INJECT_KEY,
      {}
    )

    return () => {
      const { token } = props
      const comp =
        (customComponents && customComponents[token.type]) ??
        defaultRenderers[token.type]

      if (!comp) {
        if (token.children?.length) {
          // Vue 2 cannot return arrays from render functions — wrap in span.
          return h(
            'span',
            token.children.map((child) =>
              h(MarkdownTokenNode, { key: child.id, props: { token: child } })
            )
          )
        }
        // Vue 2 cannot return plain strings — wrap in span.
        return h('span', { class: 'ms-token-text' }, [token.content ?? ''])
      }

      // Vue 2: component props go in props:{}
      return h(comp, { props: { token } })
    }
  },
})

// Break circular dependency: tell default-renderers about this component
registerMarkdownTokenNode(MarkdownTokenNode)

export default MarkdownTokenNode
</script>
