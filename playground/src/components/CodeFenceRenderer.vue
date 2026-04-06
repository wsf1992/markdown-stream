<script setup lang="ts">
import type { StatefulToken } from '@markdown-stream/core'
import CodeSkeleton from './CodeSkeleton.vue'
import CodeStreaming from './CodeStreaming.vue'
import CodeBlock from './CodeBlock.vue'

defineProps<{ token: StatefulToken }>()
</script>

<template>
  <CodeSkeleton v-if="token.state === 'start'" :token="token" />
  <CodeStreaming v-else-if="token.state === 'streaming'" :token="token" />
  <CodeBlock v-else :token="token" />
</template>
