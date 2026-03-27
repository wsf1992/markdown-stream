<script setup lang="ts">
import { ref } from 'vue'
import DemoOnce from './components/DemoOnce.vue'
import DemoStream from './components/DemoStream.vue'
import DemoSfc from './components/DemoSfc.vue'

const tabs = [
  { key: 'once',   label: '一次性渲染' },
  { key: 'stream', label: '流式渲染'   },
  { key: 'chat',   label: '与大模型对话' },
] as const

type Tab = typeof tabs[number]['key']
const active = ref<Tab>('once')
</script>

<template>
  <nav>
    <button
      v-for="t in tabs"
      :key="t.key"
      :class="{ active: active === t.key }"
      @click="active = t.key"
    >
      {{ t.label }}
    </button>
  </nav>

  <div class="page">
    <DemoOnce   v-if="active === 'once'"   />
    <DemoStream v-if="active === 'stream'" />
    <DemoSfc    v-if="active === 'chat'"   />
  </div>
</template>