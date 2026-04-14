<script setup lang="ts">
import { h } from 'vue'
import type { StatefulToken } from '@markdown-stream/core'

const props = defineProps<{
  token: StatefulToken
}>()

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
    {{ props.token.content  }}
  </span>
</template>