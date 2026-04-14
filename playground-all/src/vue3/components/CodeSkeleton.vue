<script setup lang="ts">
import type { StatefulToken } from '@markdown-stream/core'
defineProps<{ token: StatefulToken }>()
</script>

<template>
  <div class="skeleton" />
</template>
