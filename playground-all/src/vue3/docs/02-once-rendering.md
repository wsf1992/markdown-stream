# 一次性渲染（DemoOnce）

## 功能说明

一次性渲染模式下，将完整的 Markdown 字符串直接传给 `MarkdownStream`（或其封装组件 `MarkdownWithTokens`），组件解析后立即渲染出完整结果，不涉及流式分批。

适用场景：

- 渲染历史聊天记录（已接收完整内容）
- 渲染静态 Markdown 文档
- 对比流式/非流式输出结果

## 源码位置

[playground/src/components/DemoOnce.vue](../src/components/DemoOnce.vue)

## 完整代码

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { MarkdownWithTokens } from '../tokens'
import TEMPLATE from '../tokens.md?raw'

const source = ref(TEMPLATE)
const rendered = ref(TEMPLATE)

function render() {
  rendered.value = source.value
}
</script>

<template>
  <div>
    <div class="controls">
      <button class="run" @click="render">渲染</button>
    </div>
    <div class="panel">
      <div class="box">
        <h3>Markdown 输入</h3>
        <textarea v-model="source" :rows="100" />
      </div>
      <div class="box">
        <h3>渲染结果</h3>
        <MarkdownWithTokens :content="rendered" debug />
      </div>
    </div>
  </div>
</template>
```

## 关键细节

### content prop 传字符串

当 `content` 是字符串类型时，`MarkdownStream` 进入**一次性渲染模式**，所有 token 直接以 `done` 状态输出，不会经历 `start → streaming → done` 三态过渡。

```ts
// 字符串 → 一次性渲染，所有 token 直接 done
<MarkdownWithTokens :content="rendered" />
```

### debug 模式

传入 `:debug="true"` 后，每个 token 的 `state` 变化（`start` / `streaming` / `done`）会打印到浏览器控制台，便于调试自定义 token 的生命周期。

```vue
<MarkdownWithTokens :content="rendered" debug />
```

### 双栏布局

左侧是可编辑的 `<textarea>`，右侧是实时渲染结果。点击「渲染」后将左侧内容赋值给 `rendered`，触发右侧重新渲染。这种设计的好处是**不会在每次键入时都触发重渲染**，而是由用户主动触发，避免中间状态的 token 解析出错。

## 使用方式

```vue
<script setup lang="ts">
import { MarkdownStream } from '@markdown-stream/vue3'

const markdownContent = `# Hello\n\n这是一段 **Markdown** 文字。`
</script>

<template>
  <MarkdownStream :content="markdownContent" />
</template>
```

传入 `components` 可以自定义 token 渲染：

```vue
<MarkdownStream
  :content="markdownContent"
  :components="[
    { name: 'fence', done: MyCodeBlock }
  ]"
/>
```
