<script lang="ts">
import { defineComponent, computed, ref } from 'vue'
import type { PropType } from 'vue'
import type { StatefulToken } from '@markdown-stream/core'

interface LinkData {
  url: string
  name?: string
}

export default defineComponent({
  name: 'LinkToken',
  props: {
    token: { type: Object as PropType<StatefulToken>, required: true },
  },
  setup(props) {
    const linkData = computed<LinkData>(() => {
      try {
        return JSON.parse(props.token.content || '{}')
      } catch {
        return { url: '', name: '' }
      }
    })

    const visible = ref(false)

    function toggle(e: MouseEvent) {
      e.stopPropagation()
      visible.value = !visible.value
    }

    function navigate() {
      if (linkData.value.url) {
        window.open(linkData.value.url, '_blank', 'noopener,noreferrer')
        visible.value = false
      }
    }

    function close() {
      visible.value = false
    }

    return { linkData, visible, toggle, navigate, close }
  },
})
</script>

<template>
  <span class="link-token" @click.stop>
    <button
      class="link-btn"
      :class="{ active: visible }"
      :aria-label="linkData.name || '链接'"
      @click="toggle"
    >
      ?
    </button>
    <span v-if="visible" class="link-popover">
      <span class="link-popover-name" @click="navigate">{{ linkData.name || linkData.url }}</span>
      <button class="link-popover-close" @click="close">×</button>
    </span>
  </span>
</template>

<style scoped>
.link-token {
  position: relative;
  display: inline-flex;
  align-items: center;
  vertical-align: middle;
}
.link-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1.5px solid #6366f1;
  background: #fff;
  color: #6366f1;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  padding: 0;
  transition: background 0.15s, color 0.15s;
  vertical-align: middle;
}
.link-btn:hover, .link-btn.active {
  background: #6366f1;
  color: #fff;
}
.link-popover {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #1e1e2e;
  color: #e2e8f0;
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 13px;
  white-space: nowrap;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
  z-index: 100;
}
.link-popover::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-top-color: #1e1e2e;
}
.link-popover-name {
  cursor: pointer;
  color: #818cf8;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.link-popover-name:hover { color: #a5b4fc; }
.link-popover-close {
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  padding: 0 2px;
}
.link-popover-close:hover { color: #e2e8f0; }
</style>
