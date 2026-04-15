<script lang="ts">
import { defineComponent, ref } from 'vue'
import { MarkdownWithTokens } from '../tokens'
import TEMPLATE from '../../shared/tokens.md?raw'

const CHUNKS = TEMPLATE.split('\n')

export default defineComponent({
  name: 'DemoStream',
  components: { MarkdownWithTokens },
  setup() {
    const delay = ref(200)
    const stream = ref<AsyncIterable<string> | undefined>()
    const isRunning = ref(false)

    async function* makeStream(ms: number): AsyncIterable<string> {
      for (const chunk of CHUNKS) {
        await new Promise((r) => setTimeout(r, ms))
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

    return { delay, stream, isRunning, start }
  },
})
</script>

<template>
  <div>
    <div class="controls">
      <button class="run" :disabled="isRunning" @click="start">▶ 开始流式输出</button>
      <label>
        延迟
        <input type="range" v-model.number="delay" min="80" max="500" />
        {{ delay }}ms
      </label>
    </div>
    <div class="box">
      <h3>渲染结果（含所有自定义 Token）</h3>
      <MarkdownWithTokens v-if="stream" :content="stream" />
      <p v-else style="color:#9ca3af;font-size:13px">点击按钮开始流式渲染</p>
    </div>
  </div>
</template>
