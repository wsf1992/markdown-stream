<script setup lang="ts">
import { computed } from 'vue'
import type { StatefulToken } from '@markdown-stream/core'

const props = defineProps<{
  token: StatefulToken
}>()

</script>

<template>
  <div class="preview-block">
    <div class="preview-content">
      {{ token.content }}
    </div>
  </div>
</template>

<style scoped>
.preview-block {
  border: 3px solid #f97316;
  border-radius: 12px;
  overflow: hidden;
  margin: 16px 0;
  background: #fff;
  box-shadow: 0 8px 24px rgba(249, 115, 22, 0.2);
}

.preview-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(90deg, #f97316, #ef4444);
  border-bottom: 2px solid #ea580c;
}

.preview-badge {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  background: rgba(255,255,255,0.25);
  padding: 4px 12px;
  border-radius: 20px;
  text-shadow: 0 1px 2px rgba(0,0,0,0.2);
}

.preview-content {
  padding: 20px;
}

.preview-content :deep(.card) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
}

.preview-content :deep(h2) {
  margin: 0 0 16px 0;
  font-size: 24px;
}

.preview-content :deep(.field) {
  display: flex;
  margin-bottom: 12px;
}

.preview-content :deep(.label) {
  font-weight: 600;
  min-width: 100px;
  opacity: 0.9;
}

.preview-content :deep(.value) {
  font-weight: 400;
}

.preview-content :deep(.btn) {
  background: rgba(255,255,255,0.2);
  border: 1px solid rgba(255,255,255,0.3);
  color: white;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  margin-right: 8px;
}

.preview-content :deep(.btn:hover) {
  background: rgba(255,255,255,0.3);
}
</style>