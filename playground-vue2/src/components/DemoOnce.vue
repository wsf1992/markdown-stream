<script lang="ts">
import { defineComponent, ref } from 'vue'
import { MarkdownWithTokens } from '../tokens'
import TEMPLATE from '../tokens.md?raw'

export default defineComponent({
  name: 'DemoOnce',
  components: { MarkdownWithTokens },
  setup() {
    const source = ref(TEMPLATE)
    const rendered = ref(TEMPLATE)

    function render() {
      rendered.value = source.value
    }

    return { source, rendered, render }
  },
})
</script>

<template>
  <div>
    <div class="controls">
      <button class="run" @click="render">渲染</button>
    </div>
    <div class="panel">
      <div class="box">
        <h3>Markdown 输入</h3>
        <textarea v-model="source" :rows="30" />
      </div>
      <div class="box">
        <h3>渲染结果</h3>
        <MarkdownWithTokens :content="rendered" :debug="false" />
      </div>
    </div>
  </div>
</template>
