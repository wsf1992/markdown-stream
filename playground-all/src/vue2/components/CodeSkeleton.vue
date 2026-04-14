<script lang="ts">
import { defineComponent } from 'vue'
import type { PropType } from 'vue'
import type { StatefulToken } from '@markdown-stream/core'

export default defineComponent({
  name: 'CodeSkeleton',
  props: {
    token: { type: Object as PropType<StatefulToken>, required: true },
  },
})
</script>

<template>
  <div class="skeleton" />
</template>
