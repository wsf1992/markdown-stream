<script setup lang="ts">
import type { StatefulToken } from '@markdown-stream/core'
defineProps<{ token: StatefulToken }>()
</script>

<template>
  <pre style="position:relative">
    <code>{{ token.content }}</code>
    <span style="position:absolute;right:10px;top:8px;font-size:11px;background:#3b82f6;color:#fff;padding:1px 6px;border-radius:4px">
      {{ (token.meta?.info as string) || 'code' }}
    </span>
  </pre>
</template>
