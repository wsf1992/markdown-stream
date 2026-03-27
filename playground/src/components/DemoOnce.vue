<script setup lang="ts">
import { ref } from 'vue'
import { MarkdownStream } from '@markdown-stream/vue3'
import PinkHighlight from './PinkHighlight.vue'

const DEFAULT = `# 一次性渲染示例

这是一段**粗体**和*斜体*文字，还有 \`inline code\`。

pink1这是粉色高亮文本pink1

2432423pink这是粉色高亮文本pink23423423

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
    name: 'pink_highlight',
    contentRegex: /^pink1(.+)pink1$/,
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
