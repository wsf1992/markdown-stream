<script lang="ts">
import { defineComponent, ref } from 'vue'
import DemoOnce from './components/DemoOnce.vue'
import DemoStream from './components/DemoStream.vue'

const tabs = [
  { key: 'once',   label: '一次性渲染' },
  { key: 'stream', label: '流式渲染'   },
] as const

type Tab = typeof tabs[number]['key']

export default defineComponent({
  name: 'App',
  components: { DemoOnce, DemoStream },
  setup() {
    const active = ref<Tab>('once')
    return { tabs, active }
  },
})
</script>

<template>
  <!-- Vue 2 requires a single root element -->
  <div>
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
    </div>
  </div>
</template>
