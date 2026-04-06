import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { StatefulToken } from '@markdown-stream/core'
import VueSfcFenceRenderer from '../src/components/VueSfcFenceRenderer.vue'

function makeToken(content: string): StatefulToken {
  return {
    id: 'vue-sfc-1',
    type: 'vue_sfc',
    state: 'done',
    content,
  }
}

describe('VueSfcFenceRenderer', () => {
  it('renders the card header and metrics toolbar', () => {
    const wrapper = mount(VueSfcFenceRenderer, {
      props: {
        token: makeToken('<template><div></template>'),
        title: 'AI 计数器卡片',
        onError: () => undefined,
        metrics: {
          tps: 236,
          totalChars: 1163,
          elapsed: 4.93,
          renderTime: 44,
        },
      },
    })

    expect(wrapper.find('.ms-sfc-card-title').text()).toBe('AI 计数器卡片')
    expect(wrapper.text()).toContain('236 字符/秒')
    expect(wrapper.text()).toContain('1163 字符')
    expect(wrapper.text()).toContain('生成 4.9s')
    expect(wrapper.text()).toContain('渲染 44ms')
    expect(wrapper.find('.ms-sfc-card-copy').text()).toBe('复制')
    expect(wrapper.find('.ms-sfc-parse-errors').exists()).toBe(true)
  })

  it('uses the default title when none is provided', () => {
    const wrapper = mount(VueSfcFenceRenderer, {
      props: {
        token: makeToken('<template><div></template>'),
        onError: () => undefined,
      },
    })

    expect(wrapper.find('.ms-sfc-card-title').text()).toBe('组件预览')
  })
})
