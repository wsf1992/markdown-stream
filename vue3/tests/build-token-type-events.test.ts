import { describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, onMounted } from 'vue'
import MarkdownStream from '../src/components/MarkdownStream.vue'

describe('Custom token event handlers', () => {
  it('maps kebab-case event names to Vue listeners', async () => {
    const onRenderSuccess = vi.fn()

    const EmittingFence = defineComponent({
      emits: ['render-success'],
      setup(_props, { emit }) {
        onMounted(() => {
          emit('render-success', { renderTime: 44 })
        })
        return () => h('div', { class: 'emitting-fence' }, 'ok')
      },
    })

    const wrapper = mount(MarkdownStream, {
      props: {
        source: '```ui\n<template><div>ok</div></template>\n```',
        components: [
          {
            name: 'vue_sfc',
            openRegex: /^ui$/,
            component: EmittingFence,
            on: { 'render-success': onRenderSuccess },
          },
        ],
      },
    })

    await flushPromises()
    expect(wrapper.find('.emitting-fence').exists()).toBe(true)
    expect(onRenderSuccess).toHaveBeenCalledWith({ renderTime: 44 })
  })
})
