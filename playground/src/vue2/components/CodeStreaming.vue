<script lang="ts">
import { defineComponent } from 'vue'
import type { PropType } from 'vue'
import type { StatefulToken } from '@markdown-stream/core'

export default defineComponent({
  name: 'CodeStreaming',
  props: {
    token: { type: Object as PropType<StatefulToken>, required: true },
  },
})
</script>

<template>
  <pre class="ms-root" style="position:relative">
    <code>{{ token.content }}</code>
    <span style="position:absolute;right:10px;top:8px;font-size:11px;opacity:0.5">输入中…</span>
  </pre>
</template>
