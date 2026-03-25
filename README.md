# markdown-stream

流式 Markdown 解析与渲染工具库。专为 LLM 流式输出场景设计，支持逐块写入并输出带状态（`start / streaming / done`）的结构化 token 树，方便在 UI 层实现平滑的实时渲染。

## 包结构

| 包 | 说明 |
|----|------|
| [`@markdown-stream/core`](./core) | 核心解析库，基于 `markdown-it`，框架无关 |
| [`@markdown-stream/vue3`](./vue3) | Vue 3 组件层，提供开箱即用的 `<MarkdownStream>` 组件 |

## 核心能力

- **流式输入**：逐块（chunk）写入 Markdown，每次仅返回发生变化的 token
- **状态追踪**：每个 block token 携带 `start / streaming / done` 三种状态
- **稳定 ID**：流式过程中 token ID 保持不变，方便 UI 层做精准更新（key-based diff）
- **自定义 token**：支持通过 `defineTokenType` / `components` 扩展解析规则和渲染组件
- **框架无关核心**：`@markdown-stream/core` 不依赖任何 UI 框架

## 快速上手

### 安装

```bash
# 核心库（框架无关）
npm install @markdown-stream/core

# Vue 3 组件
npm install @markdown-stream/vue3 @markdown-stream/core vue
```

### Vue 3 流式渲染

```vue
<script setup lang="ts">
import { MarkdownStream } from '@markdown-stream/vue3'

async function* aiStream() {
  yield '# Title\n\n'
  yield 'Streaming content...'
}
</script>

<template>
  <MarkdownStream :stream="aiStream()" />
</template>
```

### 核心库（框架无关）

```ts
import { createMarkdownProcessor } from '@markdown-stream/core'

const processor = createMarkdownProcessor()

for await (const chunk of llmStream) {
  const changed = processor.write(chunk)
  for (const token of changed) {
    // token.state: 'start' | 'streaming' | 'done'
    renderToken(token)
  }
}
```

## 详细文档

- [core 文档](./core/README.md) — API 参考、数据模型、自定义 token 类型、内部架构
- [vue3 文档](./vue3/README.md) — 组件 Props、自定义渲染、按状态分组件渲染
# markdown-stream
