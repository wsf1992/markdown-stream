<script setup lang="ts">
import { MarkdownTokenNode } from '@markdown-stream/vue3'
import type { StatefulToken } from '@markdown-stream/core'
const props = defineProps<{ token: StatefulToken }>()

const labels: Record<string, string> = {
  info: 'ℹ️ 提示',
  warning: '⚠️ 注意',
  danger: '🚨 危险',
}
</script>

<template>
  <div :class="`callout callout-${token.meta?.kind ?? 'info'}`" :data-state="token.state">
    <div class="label">{{ labels[token.meta?.kind as string] ?? '提示' }}</div>
    <MarkdownTokenNode
      v-for="child in token.children"
      :key="child.id"
      :token="child"
    />
  </div>
</template>
