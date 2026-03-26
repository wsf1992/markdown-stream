<script setup lang="ts">
import { ref } from 'vue'
import { MarkdownStream } from '@markdown-stream/vue3'

const CHUNKS = [
  '# 流式渲染\n\n',
  '正在模拟 AI **逐字输出**...\n\n',
  '## 代码示例\n\n',
  '```ts\n',
  'async function* stream() {\n',
  '  yield "Hello"\n',
  '  yield " World"\n',
  '}\n',
  '```\n\n',
  '## 列表\n\n',
  '- 第一项\n',
  '- 第二项\n',
  '- 第三项\n\n',
  '> 这是引用内容。\n\n',
  '完成！🎉',
]

const delay = ref(120)
const stream = ref<AsyncIterable<string> | undefined>()
const isRunning = ref(false)

async function* makeStream(ms: number): AsyncIterable<string> {
  for (const chunk of CHUNKS) {
    await new Promise(r => setTimeout(r, ms))
    yield chunk
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
      <label>延迟 <input type="range" v-model.number="delay" min="30" max="500" /> {{ delay }}ms</label>
    </div>
    <div class="box">
      <h3>渲染结果</h3>
      <MarkdownStream v-if="stream" :stream="stream" />
      <p v-else style="color:#9ca3af;font-size:13px">点击按钮开始</p>
    </div>
  </div>
</template>
