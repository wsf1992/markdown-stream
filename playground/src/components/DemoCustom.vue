<script setup lang="ts">
import { ref } from 'vue'
import { MarkdownStream } from '@markdown-stream/vue3'
import CodeSkeleton from './CodeSkeleton.vue'
import CodeStreaming from './CodeStreaming.vue'
import CodeBlock from './CodeBlock.vue'
import CalloutBlock from './CalloutBlock.vue'
import PreviewRenderer from './PreviewRenderer.vue'
import InlineHighlight from './InlineHighlight.vue'

// 自定义 components 配置
const components = [
  // fence：三态渲染 — 骨架屏 / 输入中 / 完成高亮
  {
    name: 'fence',
    start:     CodeSkeleton,
    streaming: CodeStreaming,
    done:      CodeBlock,
  },
  // json-preview：JSON 预览组件
  {
    name: 'json-preview',
    openRegex: /^json-preview$/,
    component: PreviewRenderer,
  },
  // callout-info：匹配 ```callout-info
  {
    name: 'callout-info',
    openRegex: /^callout-info$/,
    component: CalloutBlock,
  },
  // callout-warning：匹配 ```callout-warning
  {
    name: 'callout-warning',
    openRegex: /^callout-warning$/,
    component: CalloutBlock,
  },
  // callout-danger：匹配 ```callout-danger
  {
    name: 'callout-danger',
    openRegex: /^callout-danger$/,
    component: CalloutBlock,
  },
  // 内联自定义：覆盖 strong（**加粗**）的默认渲染，改为高亮样式
  {
    name: 'strong',
    component: InlineHighlight,
  },
]

const CHUNKS = [
  '# 自定义 Token 演示\n\n',
  '下面是一个 **三态代码块**（start → streaming → done）：\n\n',
  '```ts\n',
  'const x = ',
  '1 + 2\n',
  'console.',
  'log(x)\n',
  '```\n\n',
  '以及自定义 callout 块：\n\n',
  '```callout-info\n这是一条提示信息。\n```\n\n',
  '```callout-warning\n请注意这个警告。\n```\n\n',
  '```callout-danger\n危险操作，请确认！\n```\n\n',
  'JSON 预览示例：\n\n',
  '```json-preview\n',
  '{"title": "用户卡片", "name": "张三", "age": 28, "email": "zhangsan@example.com", "buttons": ["编辑", "删除"]}',
  '\n```\n\n',
  '## 内联自定义示例\n\n',
  '这是一个 **自定义高亮** 组件，覆盖了默认的 **加粗** 渲染。\n\n',
  '可以看到 **黄色高亮** 效果，而不是传统的 **加粗** 样式。\n',
]

const delay = ref(100)
const stream = ref<AsyncIterable<string> | undefined>()

async function* makeStream(ms: number): AsyncIterable<string> {
  for (const chunk of CHUNKS) {
    await new Promise(r => setTimeout(r, ms))
    yield chunk
  }
}

function start() {
  stream.value = undefined
  setTimeout(() => { stream.value = makeStream(delay.value) }, 50)
}
</script>

<template>
  <div>
    <div class="controls">
      <button class="run" @click="start">▶ 开始流式输出</button>
      <label>延迟 <input type="range" v-model.number="delay" min="30" max="400" /> {{ delay }}ms</label>
    </div>
    <div class="box">
      <h3>渲染结果（含自定义 Token）</h3>
      <MarkdownStream
        v-if="stream"
        :stream="stream"
        :components="components"
      />
      <p v-else style="color:#9ca3af;font-size:13px">点击按钮开始</p>
    </div>
  </div>
</template>
