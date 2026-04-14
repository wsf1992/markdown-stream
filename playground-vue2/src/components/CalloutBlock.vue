<script lang="ts">
import { defineComponent } from 'vue'
import type { PropType } from 'vue'
import type { StatefulToken } from '@markdown-stream/core'
import { MarkdownTokenNode } from '@markdown-stream/vue2'

const labels: Record<string, string> = {
  'callout-info':    'ℹ️ 提示',
  'callout-warning': '⚠️ 注意',
  'callout-danger':  '🚨 危险',
}

export default defineComponent({
  name: 'CalloutBlock',
  components: { MarkdownTokenNode },
  props: {
    token: { type: Object as PropType<StatefulToken>, required: true },
  },
  setup() {
    return { labels }
  },
})
</script>

<template>
  <div :class="`callout callout-${token.type}`" :data-state="token.state">
    <div class="label">{{ labels[token.type] || '提示' }}</div>
    <MarkdownTokenNode
      v-for="child in token.children"
      :key="child.id"
      :token="child"
    />
  </div>
</template>
