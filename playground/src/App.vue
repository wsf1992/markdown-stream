<script setup lang="ts">
import { ref } from 'vue'
import DemoOnce from './components/DemoOnce.vue'
import DemoStream from './components/DemoStream.vue'
import DemoCustom from './components/DemoCustom.vue'
import DemoSfc from './components/DemoSfc.vue'

const tabs = [
  { key: 'once',   label: '一次性渲染' },
  { key: 'stream', label: '流式输入'   },
  { key: 'custom', label: '自定义 Token & 组件' },
  { key: 'sfc',    label: 'Vue SFC 渲染' },
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
    <DemoCustom v-if="active === 'custom'" />
    <DemoSfc    v-if="active === 'sfc'"    />
  </div>
</template>
