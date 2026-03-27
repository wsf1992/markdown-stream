<script setup lang="ts">
import { ref } from 'vue'
import { MarkdownStream, VueSfcFenceRenderer, SfcRendererPending } from '@markdown-stream/vue3'
import PreviewRenderer from './PreviewRenderer.vue'
import JsonBlock from './JsonBlock.vue'
import InlineHighlight from './InlineHighlight.vue'
import PinkHighlight from './PinkHighlight.vue'

const DEFAULT = `# 一次性渲染示例

这是一段**粗体**和*斜体*文字，还有 \`inline code\`。

pink这是粉色高亮文本pink

## Vue SFC 代码块（\`\`\`ui）

\`\`\`ui
<template>
  <div class="counter-card">
    <h3>计数器</h3>
    <button @click="count++">+1</button>
    <span>当前值：{{ count }}</span>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const count = ref(0)
<\/script>

<style scoped>
.counter-card { display: flex; align-items: center; gap: 8px; }
</style>
\`\`\`

## Vue 预览代码块（\`\`\`preview）

\`\`\`preview
<template>
  <div class="preview-box">
    <h4>预览组件</h4>
    <p>当前时间：{{ now }}</p>
  </div>
</template>

<script setup>
const now = new Date().toLocaleTimeString()
<\/script>
\`\`\`

## JSON 代码块（\`\`\`json）

\`\`\`json
{
  "name": "markdown-stream",
  "feature": ["vue_sfc", "vue_preview", "json"],
  "enabled": true
}
\`\`\`

## 列表

- 苹果
- 香蕉
- 橙子

1. 第一步
2. 第二步
3. 第三步

## 引用

> 这是一段引用文字，来自某位智者。

## 代码块

\`\`\`ts
function greet(name: string) {
  return \`Hello, \${name}!\`
}
\`\`\`

## 链接

访问 [GitHub](https://github.com) 了解更多。
`

const source = ref(DEFAULT)
const rendered = ref(DEFAULT)

function render() {
  rendered.value = source.value
}

const components = [
  {
    name: 'vue_sfc',
    openRegex: /^ui$/,
    start: SfcRendererPending,
    streaming: SfcRendererPending,
    done: VueSfcFenceRenderer,
  },
  {
    name: 'vue_preview',
    openRegex: /^preview$/,
    start: PreviewRenderer,
    streaming: PreviewRenderer,
    done: PreviewRenderer,
  },
  {
    name: 'json',
    openRegex: /^json$/,
    start: JsonBlock,
    streaming: JsonBlock,
    done: JsonBlock,
  },
  {
    name: 'strong',
    component: InlineHighlight,
  },
  {
    name: 'pink_highlight',
    contentRegex: /^pink(.+)pink$/,
    component: PinkHighlight,
  },
]

</script>

<template>
  <div>
    <div class="controls">
      <button class="run" @click="render">渲染</button>
    </div>
    <div class="panel">
      <div class="box">
        <h3>Markdown 输入</h3>
        <textarea v-model="source" />
      </div>
      <div class="box">
        <h3>渲染结果</h3>
        <MarkdownStream :source="rendered" :components="components" debug />
      </div>
    </div>
  </div>
</template>
