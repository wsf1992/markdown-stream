<script lang="ts">
import { defineComponent } from 'vue'
import type { PropType } from 'vue'
import type { StatefulToken } from '@markdown-stream/core'
import CodeSkeleton from './CodeSkeleton.vue'
import CodeStreaming from './CodeStreaming.vue'
import CodeBlock from './CodeBlock.vue'

export default defineComponent({
  name: 'CodeFenceRenderer',
  components: { CodeSkeleton, CodeStreaming, CodeBlock },
  props: {
    token: { type: Object as PropType<StatefulToken>, required: true },
  },
})
</script>

<template>
  <div>
    <CodeSkeleton  v-if="token.state === 'start'"     :token="token" />
    <CodeStreaming v-else-if="token.state === 'streaming'" :token="token" />
    <CodeBlock     v-else                              :token="token" />
  </div>
</template>
