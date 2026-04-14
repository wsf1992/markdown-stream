<script setup lang="ts">
import { ref, computed } from 'vue'
import { MarkdownWithTokens } from '../tokens'

// 用 import.meta.glob 批量加载 docs 目录下所有 md 文件
const modules = import.meta.glob('../docs/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

interface DocFile {
  key: string
  title: string
  content: string
}

const docs = computed<DocFile[]>(() => {
  return Object.entries(modules)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, content]) => {
      const filename = path.split('/').pop()!
      // 从文件内容第一行 # 标题提取
      const firstLine = (content as string).split('\n').find(l => l.startsWith('# '))
      const title = firstLine ? firstLine.replace(/^#\s+/, '') : filename.replace('.md', '')
      return { key: filename, title, content: content as string }
    })
})

const active = ref(docs.value[0]?.key ?? '')
const activeDoc = computed(() => docs.value.find(d => d.key === active.value))
</script>

<template>
  <div class="docs-layout">
    <!-- 侧边栏 -->
    <aside class="sidebar">
      <div class="sidebar-title">文档目录</div>
      <nav>
        <button
          v-for="doc in docs"
          :key="doc.key"
          class="nav-item"
          :class="{ active: active === doc.key }"
          @click="active = doc.key"
        >
          {{ doc.title }}
        </button>
      </nav>
    </aside>

    <!-- 内容区 -->
    <main class="content">
      <MarkdownWithTokens v-if="activeDoc" :content="activeDoc.content" />
    </main>
  </div>
</template>

<style scoped>
.docs-layout {
  display: flex;
  height: calc(100vh - 60px);
  overflow: hidden;
}

.sidebar {
  width: 220px;
  flex-shrink: 0;
  border-right: 1px solid #e5e7eb;
  overflow-y: auto;
  padding: 12px 0;
  background: #f9fafb;
}

nav {
  flex-direction: column;
  gap: 2px;
  padding: 0;
  background: none;
  border-bottom: none;
}

.sidebar-title {
  font-size: 11px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 0 16px 8px;
}

.nav-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 7px 16px;
  font-size: 13px;
  color: #374151;
  background: none;
  border: none;
  cursor: pointer;
  border-radius: 0;
  line-height: 1.4;
  transition: background 0.15s;
}

.nav-item:hover {
  background: #f3f4f6;
}

.nav-item.active {
  background: #eff6ff;
  color: #2563eb;
  font-weight: 500;
  border-right: 2px solid #3b82f6;
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 32px 48px;
  max-width: 860px;
}
</style>
