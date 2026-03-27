<script setup lang="ts">
import type { StatefulToken } from '@markdown-stream/core'
const props = defineProps<{ token: StatefulToken }>()

interface ImageData {
  url: string
  name?: string
}

function getImageData(token: StatefulToken): ImageData {
  try {
    return JSON.parse(token.content || '{}')
  } catch {
    return { url: '', name: '' }
  }
}

const imageData = getImageData(props.token)
</script>

<template>
  <div class="image-token">
    <img v-if="imageData.url" :src="imageData.url" :alt="imageData.name || 'image'" />
    <div v-else class="loading-placeholder">Loading...</div>
    <span v-if="imageData.name" class="image-name">{{ imageData.name }}</span>
  </div>
</template>

<style scoped>
.image-token {
  margin: 12px 0;
  text-align: center;
}
.image-token img {
  max-width: 100%;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
.loading-placeholder {
  display: inline-block;
  width: 120px;
  height: 120px;
  background: #f0f0f0;
  border-radius: 8px;
  line-height: 120px;
  color: #999;
}
.image-name {
  display: block;
  margin-top: 8px;
  font-size: 14px;
  color: #666;
}
</style>