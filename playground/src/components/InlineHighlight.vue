<script setup lang="ts">
import { defineComponent, h } from 'vue'
import type { StatefulToken } from '@markdown-stream/core'

// 内联高亮组件
const InlineHighlight = defineComponent({
  name: 'InlineHighlight',
  props: {
    token: { type: Object as () => StatefulToken, required: true },
  },
  setup(props) {
    return () => {
      const text = props.token.children?.[0]?.content ?? ''
      return h('span', {
        style: {
          backgroundColor: '#fef08a',
          padding: '2px 4px',
          borderRadius: '3px',
          color: '#854d0e',
        },
      }, text)
    }
  },
})
</script>