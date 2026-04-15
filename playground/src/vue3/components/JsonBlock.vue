<script setup lang="ts">
import { computed } from 'vue'
import type { StatefulToken } from '@markdown-stream/core'

const props = defineProps<{ token: StatefulToken }>()

const parsedJson = computed(() => {
  try {
    const content = props.token.content?.trim() || ''
    if (!content) return null
    return JSON.parse(content)
  } catch {
    return null
  }
})

const formattedJson = computed(() => {
  if (!parsedJson.value) return ''
  return JSON.stringify(parsedJson.value, null, 2)
})

const hasError = computed(() => !parsedJson.value && props.token.content?.trim())

const imgUrl = computed(() => {
  if (!parsedJson.value) return null
  const url = parsedJson.value.img || parsedJson.value.image || parsedJson.value.imageUrl || null
  if (url && typeof url === 'string' && url.startsWith('//')) {
    return 'https:' + url
  }
  return url
})
</script>

<template>
  <div class="json-block">
    <!-- 图片预览 -->
    <div v-if="imgUrl" class="json-image">
      <img :src="imgUrl" alt="JSON Image" />
    </div>
    <div class="json-header">
      <span class="json-badge">JSON</span>
      <button v-if="parsedJson" class="copy-btn" @click="navigator.clipboard.writeText(formattedJson)">
        复制
      </button>
    </div>
    <pre v-if="parsedJson" class="json-content"><code>{{ formattedJson }}</code></pre>
    <pre v-else-if="hasError" class="json-error"><code>{{ token.content }}</code></pre>
    <div v-else class="json-loading">
      <span class="dots"><span></span><span></span><span></span></span>
    </div>
  </div>
</template>

<style scoped>
.json-block {
  position: relative;
  background: #1e293b;
  border-radius: 8px;
  overflow: hidden;
  margin: 12px 0;
}

.json-image {
  padding: 12px;
  background: #fff;
  display: flex;
  justify-content: center;
}

.json-image img {
  max-width: 100%;
  max-height: 200px;
  border-radius: 4px;
  object-fit: contain;
}

.json-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #0f172a;
  border-bottom: 1px solid #334155;
}

.json-badge {
  font-size: 11px;
  font-weight: 600;
  color: #a5b4fc;
  background: #4f46e5;
  padding: 2px 8px;
  border-radius: 4px;
}

.copy-btn {
  font-size: 12px;
  color: #94a3b8;
  background: transparent;
  border: 1px solid #475569;
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.copy-btn:hover {
  color: #fff;
  background: #475569;
}

.json-content {
  padding: 16px;
  margin: 0;
  overflow-x: auto;
  color: #e2e8f0;
  font-size: 13px;
  line-height: 1.5;
}

.json-content code {
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
}

.json-error {
  padding: 16px;
  margin: 0;
  color: #f87171;
  font-size: 13px;
}

.json-loading {
  padding: 20px;
  display: flex;
  justify-content: center;
}

.dots {
  display: flex;
  gap: 4px;
}

.dots span {
  width: 8px;
  height: 8px;
  background: #64748b;
  border-radius: 50%;
  animation: bounce 0.6s infinite alternate;
}

.dots span:nth-child(2) { animation-delay: 0.15s; }
.dots span:nth-child(3) { animation-delay: 0.3s; }

@keyframes bounce {
  to { transform: translateY(-6px); }
}
</style>