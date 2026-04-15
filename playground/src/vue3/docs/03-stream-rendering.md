# 流式渲染（DemoStream）

## 功能说明

流式渲染模式下，内容以 `AsyncIterable<string>` 形式逐 chunk 推送给 `MarkdownStream`，组件边接收边解析，每个 token 经历 `start → streaming → done` 三个状态，并在每次状态变化时触发 Vue 响应式更新，实现打字机效果。

适用场景：

- 模拟大模型返回的 SSE 流
- 展示 token 三态渲染动画（骨架屏 → 输入中 → 完成）
- 测试自定义 token 在流式环境下的表现

## 源码位置

[playground/src/components/DemoStream.vue](../src/components/DemoStream.vue)

## 完整代码

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { MarkdownWithTokens } from '../tokens'
import TEMPLATE from '../tokens.md?raw'

const CHUNKS = TEMPLATE.split('\n')   // 按行切割，每行作为一个 chunk

const delay = ref(200)
const stream = ref<AsyncIterable<string> | undefined>()
const isRunning = ref(false)

async function* makeStream(ms: number): AsyncIterable<string> {
  for (const chunk of CHUNKS) {
    await new Promise(r => setTimeout(r, ms))
    yield chunk + '\n'
  }
}

function start() {
  isRunning.value = true
  stream.value = undefined
  setTimeout(() => {
    stream.value = makeStream(delay.value)
    isRunning.value = false
  }, 50)
}
</script>

<template>
  <div>
    <div class="controls">
      <button class="run" :disabled="isRunning" @click="start">▶ 开始流式输出</button>
      <label>
        延迟 <input type="range" v-model.number="delay" min="80" max="500" /> {{ delay }}ms
      </label>
    </div>
    <div class="box">
      <h3>渲染结果（含所有自定义 Token）</h3>
      <MarkdownWithTokens v-if="stream" :content="stream" />
      <p v-else style="color:#9ca3af;font-size:13px">点击按钮开始流式渲染</p>
    </div>
  </div>
</template>
```

## 关键细节

### makeStream — 模拟流

```ts
async function* makeStream(ms: number): AsyncIterable<string> {
  for (const chunk of CHUNKS) {
    await new Promise(r => setTimeout(r, ms))
    yield chunk + '\n'
  }
}
```

这里将整段 Markdown 按换行符拆成行数组，每隔 `ms` 毫秒 `yield` 一行。用户可通过滑块调整延迟（80ms ~ 500ms），感受不同速度下的流式效果。

### 重置流的技巧

```ts
function start() {
  isRunning.value = true
  stream.value = undefined          // 先置 undefined，卸载旧的 MarkdownStream 实例
  setTimeout(() => {
    stream.value = makeStream(delay.value)  // 50ms 后重新赋值，确保 Vue 完成 unmount
    isRunning.value = false
  }, 50)
}
```

通过 `v-if="stream"` + 先设为 `undefined` 再赋新值，强制 `MarkdownWithTokens` 组件销毁重建，清空上次渲染的 token 状态，避免流式数据叠加。

### content 传入 AsyncIterable

```vue
<!-- 流式模式：传 AsyncIterable<string> -->
<MarkdownWithTokens :content="stream" />
```

`MarkdownStream` 内部会异步消费该迭代器，每收到一个 chunk 就追加到内部 buffer 并触发增量解析。

### token 三态变化

以代码块（fence）为例，流式输入过程中的状态变化：

| 阶段 | token.state | 渲染组件 |
|---|---|---|
| ` ```ts` 到达，但内容还未开始 | `start` | `CodeSkeleton`（骨架屏，灰色占位块） |
| 代码内容逐行到达 | `streaming` | `CodeStreaming`（显示已有代码 + "输入中…" 标记） |
| ` ``` ` 闭合符到达 | `done` | `CodeBlock`（macOS 风格深色代码框） |

## 自定义流式数据源

在真实项目中，可以直接将 `fetch` SSE 响应包装为 `AsyncIterable`：

```ts
async function* fromSSE(response: Response): AsyncIterable<string> {
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop()!

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6))
        const delta = data.choices?.[0]?.delta?.content
        if (delta) yield delta
      }
    }
  }
}

// 使用
const response = await fetch('/api/chat', { method: 'POST', ... })
const stream = fromSSE(response)
// <MarkdownStream :content="stream" />
```
