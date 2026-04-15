<script lang="ts">
import { defineComponent } from 'vue'
import type { PropType } from 'vue'
import type { StatefulToken } from '@markdown-stream/core'

export default defineComponent({
  name: 'PinkHighlight',
  props: {
    token: { type: Object as PropType<StatefulToken>, required: true },
  },
})
</script>

<template>
  <span
    :style="{
      backgroundColor: '#fce7f3',
      padding: '2px 4px',
      borderRadius: '3px',
      color: '#be185d',
      fontWeight: '500',
    }"
  >
    {{ token.content }}
  </span>
</template>
