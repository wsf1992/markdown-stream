import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import MarkdownStream from '../src/components/MarkdownStream.vue'
import type { StatefulToken } from '@markdown-stream/core'

// 直接传裸组件对象，不包裹 markRaw()
function makeComp(tag: string, cls: string) {
  return defineComponent({
    props: ['token'],
    setup(props: { token: StatefulToken }) {
      return () => h(tag, { class: cls }, props.token.content ?? props.token.meta?.info ?? '')
    },
  })
}

describe('components 数组格式', () => {
  it('覆盖已有 token 渲染（无 openRegex）', async () => {
    const wrapper = mount(MarkdownStream, {
      props: {
        source: '# Title',
        components: [{ name: 'heading', component: makeComp('div', 'custom-h') }],
      },
    })
    await flushPromises()
    expect(wrapper.find('.custom-h').exists()).toBe(true)
    expect(wrapper.find('h1').exists()).toBe(false)
  })

  it('fence 模式：openRegex 匹配 info 字段', async () => {
    const wrapper = mount(MarkdownStream, {
      props: {
        source: '```warning\nAlert content\n```',
        components: [
          { name: 'warning', openRegex: /^warning/, component: makeComp('aside', 'warning-block') },
        ],
      },
    })
    await flushPromises()
    expect(wrapper.find('.warning-block').exists()).toBe(true)
    expect(wrapper.find('.warning-block').text()).toBe('Alert content')
  })

  it('fence 模式：openRegex 字符串形式', async () => {
    const wrapper = mount(MarkdownStream, {
      props: {
        source: '```tip\nHello tip\n```',
        components: [{ name: 'tip', openRegex: '^tip', component: makeComp('div', 'tip-block') }],
      },
    })
    await flushPromises()
    expect(wrapper.find('.tip-block').exists()).toBe(true)
  })

  it('open/close 模式：openRegex + closeRegex 匹配 token.type', async () => {
    const wrapper = mount(MarkdownStream, {
      props: {
        source: '> A quoted line',
        components: [
          {
            name: 'custom-quote',
            openRegex: /^blockquote_open$/,
            closeRegex: /^blockquote_close$/,
            // 裸 defineComponent，不包裹 markRaw
            component: defineComponent({
              props: ['token'],
              setup(props: { token: StatefulToken }) {
                return () =>
                  h('section', { class: 'custom-quote' }, `children:${props.token.children?.length ?? 0}`)
              },
            }),
          },
        ],
      },
    })
    await flushPromises()
    expect(wrapper.find('.custom-quote').exists()).toBe(true)
  })

  it('未命中的 token 仍使用默认渲染', async () => {
    const wrapper = mount(MarkdownStream, {
      props: {
        source: '# Heading\n\n```warning\ncontent\n```',
        components: [
          { name: 'warning', openRegex: /^warning/, component: makeComp('aside', 'warning-block') },
        ],
      },
    })
    await flushPromises()
    expect(wrapper.find('h1').exists()).toBe(true)
    expect(wrapper.find('.warning-block').exists()).toBe(true)
  })

  it('多个自定义 token 同时生效', async () => {
    const wrapper = mount(MarkdownStream, {
      props: {
        source: '```tip\nTip content\n```\n\n```warning\nWarn content\n```',
        components: [
          { name: 'tip', openRegex: /^tip$/, component: makeComp('div', 'tip') },
          { name: 'warning', openRegex: /^warning$/, component: makeComp('div', 'warn') },
        ],
      },
    })
    await flushPromises()
    expect(wrapper.find('.tip').exists()).toBe(true)
    expect(wrapper.find('.warn').exists()).toBe(true)
  })
})

describe('state 专属渲染组件', () => {
  it('只定义 done：state=done 时渲染，start/streaming 不渲染', async () => {
    const wrapper = mount(MarkdownStream, {
      props: {
        source: '```tip\ncontent\n```',
        components: [
          { name: 'tip', openRegex: /^tip$/, done: makeComp('div', 'tip-done') },
        ],
      },
    })
    await flushPromises()
    expect(wrapper.find('.tip-done').exists()).toBe(true)
  })

  it('只定义 streaming：state=done 时不渲染（不定义则不展示）', async () => {
    const wrapper = mount(MarkdownStream, {
      props: {
        source: '```tip\ncontent\n```',
        components: [
          { name: 'tip', openRegex: /^tip$/, streaming: makeComp('div', 'tip-streaming') },
        ],
      },
    })
    await flushPromises()
    expect(wrapper.find('.tip-streaming').exists()).toBe(false)
  })

  it('state 专属优先于 component 兜底', async () => {
    const wrapper = mount(MarkdownStream, {
      props: {
        source: '```tip\ncontent\n```',
        components: [
          {
            name: 'tip',
            openRegex: /^tip$/,
            component: makeComp('div', 'tip-fallback'),
            done: makeComp('div', 'tip-done'),
          },
        ],
      },
    })
    await flushPromises()
    expect(wrapper.find('.tip-done').exists()).toBe(true)
    expect(wrapper.find('.tip-fallback').exists()).toBe(false)
  })

  it('无专属组件时回退到 component 兜底', async () => {
    const wrapper = mount(MarkdownStream, {
      props: {
        source: '```tip\ncontent\n```',
        components: [
          {
            name: 'tip',
            openRegex: /^tip$/,
            component: makeComp('div', 'tip-fallback'),
            streaming: makeComp('div', 'tip-streaming'),
          },
        ],
      },
    })
    await flushPromises()
    expect(wrapper.find('.tip-fallback').exists()).toBe(true)
    expect(wrapper.find('.tip-streaming').exists()).toBe(false)
  })
})
