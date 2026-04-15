<script setup lang="ts">
import { ref } from 'vue'
import { MarkdownWithTokens } from '../tokens'

const source = ref(`# Shadow DOM 渲染示例

下面的 Vue SFC 运行在 Shadow DOM 内部，样式完全隔离，不依赖 iframe。

\`\`\`\`ui-shadow
<template>
  <div class="card">
    <h3 class="title">🧮 Shadow DOM 计数器</h3>
    <p class="desc">样式由 Shadow DOM 隔离，不受宿主页面影响</p>
    <div class="row">
      <button class="btn dec" @click="count > 0 && count--">−</button>
      <span class="value">{{ count }}</span>
      <button class="btn inc" @click="count++">+</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const count = ref(0)
<\/script>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 24px 28px;
  max-width: 360px;
  border-radius: 16px;
  background: linear-gradient(145deg, #f0f9ff 0%, #e0f2fe 100%);
  border: 1px solid #bae6fd;
  box-shadow: 0 4px 20px rgba(14, 165, 233, 0.12);
  font-family: system-ui, sans-serif;
}
.title { margin: 0; font-size: 1.1rem; font-weight: 700; color: #0c4a6e; }
.desc  { margin: 0; font-size: 0.85rem; color: #0369a1; }
.row   { display: flex; align-items: center; gap: 20px; }
.value { font-size: 2rem; font-weight: 800; color: #0c4a6e; min-width: 48px; text-align: center; }
.btn {
  width: 40px; height: 40px;
  border: none; border-radius: 50%;
  font-size: 1.4rem; font-weight: 700;
  cursor: pointer; transition: transform .15s, filter .15s;
  display: flex; align-items: center; justify-content: center;
}
.inc { background: #0ea5e9; color: #fff; }
.dec { background: #e0f2fe; color: #0369a1; }
.btn:hover  { filter: brightness(1.08); }
.btn:active { transform: scale(.93); }
</style>
\`\`\`\`
`)

const rendered = ref(source.value)

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
        <textarea v-model="source" :rows="60" />
      </div>
      <div class="box">
        <h3>渲染结果（Shadow DOM）</h3>
        <MarkdownWithTokens :content="rendered" debug />
      </div>
    </div>
  </div>
</template>
