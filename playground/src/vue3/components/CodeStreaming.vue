<script setup lang="ts">
import type { StatefulToken } from '@markdown-stream/core'
defineProps<{ token: StatefulToken }>()
</script>

<template>
  <pre class="ms-root" style="position:relative">
    <code>{{ token.content }}</code>
    <span style="position:absolute;right:10px;top:8px;font-size:11px;opacity:0.5">输入中…</span>
  </pre>
</template>
