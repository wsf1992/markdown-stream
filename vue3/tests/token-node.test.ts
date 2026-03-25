import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { h, defineComponent } from 'vue'
import MarkdownTokenNode, { COMPONENTS_INJECT_KEY } from '../src/components/MarkdownTokenNode.vue'
import type { StatefulToken } from '@markdown-stream/core'

function makeToken(overrides: Partial<StatefulToken> & { type: string }): StatefulToken {
  return {
    id: overrides.type + '-1',
    state: 'done',
    ...overrides,
  }
}

describe('MarkdownTokenNode', () => {
  it('renders heading with correct tag level', () => {
    const token = makeToken({ type: 'heading', meta: { level: 2 }, children: [
      makeToken({ type: 'text', content: 'Title' }),
    ]})
    const wrapper = mount(MarkdownTokenNode, { props: { token } })
    expect(wrapper.find('h2').exists()).toBe(true)
    expect(wrapper.text()).toContain('Title')
  })

  it('renders paragraph', () => {
    const token = makeToken({ type: 'paragraph', children: [
      makeToken({ type: 'text', content: 'Hello' }),
    ]})
    const wrapper = mount(MarkdownTokenNode, { props: { token } })
    expect(wrapper.find('p').exists()).toBe(true)
  })

  it('renders bullet_list > list_item', () => {
    const token = makeToken({ type: 'bullet_list', children: [
      makeToken({ type: 'list_item', children: [
        makeToken({ type: 'text', content: 'Item 1' }),
      ]}),
    ]})
    const wrapper = mount(MarkdownTokenNode, { props: { token } })
    expect(wrapper.find('ul').exists()).toBe(true)
    expect(wrapper.find('li').exists()).toBe(true)
  })

  it('renders fence as pre > code', () => {
    const token = makeToken({ type: 'fence', content: 'const x = 1', meta: { info: 'js' } })
    const wrapper = mount(MarkdownTokenNode, { props: { token } })
    expect(wrapper.find('pre').exists()).toBe(true)
    expect(wrapper.find('code').exists()).toBe(true)
    expect(wrapper.find('code').text()).toBe('const x = 1')
  })

  it('renders link with href and title', () => {
    const token = makeToken({
      type: 'link',
      meta: { href: 'https://example.com', title: 'Example' },
      children: [makeToken({ type: 'text', content: 'Click' })],
    })
    const wrapper = mount(MarkdownTokenNode, { props: { token } })
    const a = wrapper.find('a')
    expect(a.exists()).toBe(true)
    expect(a.attributes('href')).toBe('https://example.com')
    expect(a.attributes('title')).toBe('Example')
  })

  it('exposes data-state attribute', () => {
    const token = makeToken({ type: 'paragraph', state: 'streaming', children: [] })
    const wrapper = mount(MarkdownTokenNode, { props: { token } })
    expect(wrapper.find('p').attributes('data-state')).toBe('streaming')
  })

  it('uses custom component when provided via injection', () => {
    const CustomHeading = defineComponent({
      props: ['token'],
      setup(props: { token: StatefulToken }) {
        return () => h('div', { class: 'custom-heading' }, 'custom')
      },
    })

    const Wrapper = defineComponent({
      setup() {
        const token = makeToken({ type: 'heading', meta: { level: 1 }, children: [] })
        return () => h(MarkdownTokenNode, { token })
      },
    })

    const wrapper = mount(Wrapper, {
      global: {
        provide: {
          [COMPONENTS_INJECT_KEY as symbol]: { heading: CustomHeading },
        },
      },
    })

    expect(wrapper.find('.custom-heading').exists()).toBe(true)
    expect(wrapper.find('h1').exists()).toBe(false)
  })

  it('renders softbreak as br', () => {
    const token = makeToken({ type: 'softbreak' })
    const wrapper = mount(MarkdownTokenNode, { props: { token } })
    expect(wrapper.find('br').exists()).toBe(true)
  })

  it('renders code_inline as code', () => {
    const token = makeToken({ type: 'code_inline', content: 'let x' })
    const wrapper = mount(MarkdownTokenNode, { props: { token } })
    expect(wrapper.find('code').text()).toBe('let x')
  })
})
