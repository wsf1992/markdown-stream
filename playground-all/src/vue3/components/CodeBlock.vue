<script setup lang="ts">
import type { StatefulToken } from '@markdown-stream/core'
defineProps<{ token: StatefulToken }>()
</script>

<template>
  <div class="code-block">
    <div class="code-header">
      <div class="mac-dots">
        <span class="dot red"></span>
        <span class="dot yellow"></span>
        <span class="dot green"></span>
      </div>
      <span class="code-lang">{{ (token.meta?.info as string) || 'code' }}</span>
    </div>
    <pre class="code-content"><code>{{ token.content }}</code></pre>
  </div>
</template>

<style scoped>
.code-block {
  background: #1e1e1e;
  border-radius: 12px;
  overflow: hidden;
  margin: 12px 0;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  border: 1px solid #3d3d3d;
}
.code-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #2d2d2d;
  border-bottom: 1px solid #3d3d3d;
}
.mac-dots {
  display: flex;
  gap: 6px;
}
.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}
.dot.red { background: #ff5f56; }
.dot.yellow { background: #ffbd2e; }
.dot.green { background: #27c93f; }
.code-lang {
  font-size: 12px;
  color: #888;
  font-family: system-ui, -apple-system, sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.code-content {
  margin: 0;
  padding: 16px;
  overflow-x: auto;
  background: #1e1e1e;
}
.code-content code {
  font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
  font-size: 13px;
  color: #d4d4d4;
  white-space: pre;
  line-height: 1.6;
}
</style>
