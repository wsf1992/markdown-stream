<script setup lang="ts">
import { h } from 'vue'
import type { StatefulToken } from '@markdown-stream/core'

const props = defineProps<{
  token: StatefulToken
}>()

// 粉色高亮组件（用于警告/注意）
// contentRegex 模式下，token.content 是提取后的内容
const text = props.token.content ?? ''
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
    {{ text }}
  </span>
</template>