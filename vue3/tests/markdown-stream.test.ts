import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import MarkdownStream from '../src/components/MarkdownStream.vue'

describe('MarkdownStream component', () => {
  it('renders heading from source', async () => {
    const wrapper = mount(MarkdownStream, {
      props: { source: '# Hello World' },
    })
    await flushPromises()
    expect(wrapper.find('h1').exists()).toBe(true)
    expect(wrapper.find('h1').text()).toBe('Hello World')
  })

  it('renders paragraph from source', async () => {
    const wrapper = mount(MarkdownStream, {
      props: { source: 'Simple paragraph.' },
    })
    await flushPromises()
    expect(wrapper.find('p').exists()).toBe(true)
    expect(wrapper.find('p').text()).toBe('Simple paragraph.')
  })

  it('renders blockquote', async () => {
    const wrapper = mount(MarkdownStream, {
      props: { source: '> A quote' },
    })
    await flushPromises()
    expect(wrapper.find('blockquote').exists()).toBe(true)
  })

  it('renders ordered list', async () => {
    const wrapper = mount(MarkdownStream, {
      props: { source: '1. Item A\n2. Item B' },
    })
    await flushPromises()
    expect(wrapper.find('ol').exists()).toBe(true)
    expect(wrapper.findAll('li').length).toBe(2)
  })

  it('renders fenced code block', async () => {
    const wrapper = mount(MarkdownStream, {
      props: { source: '```js\nconsole.log(1)\n```' },
    })
    await flushPromises()
    expect(wrapper.find('pre').exists()).toBe(true)
    expect(wrapper.find('code').exists()).toBe(true)
  })

  it('has ms-root class on root element', async () => {
    const wrapper = mount(MarkdownStream, { props: { source: '# Hi' } })
    await flushPromises()
    expect(wrapper.find('.ms-root').exists()).toBe(true)
  })

  it('renders from async stream', async () => {
    async function* makeStream() {
      yield '# Streaming'
      yield '\n\nContent'
    }

    const wrapper = mount(MarkdownStream, {
      props: { stream: makeStream() },
    })

    await flushPromises()
    expect(wrapper.find('h1').exists()).toBe(true)
  })

  it('uses custom component override', async () => {
    const CustomParagraph = defineComponent({
      props: ['token'],
      setup() {
        return () => h('section', { class: 'custom-p' }, 'custom')
      },
    })

    const wrapper = mount(MarkdownStream, {
      props: {
        source: 'Hello world',
        components: { paragraph: CustomParagraph },
      },
    })
    await flushPromises()
    expect(wrapper.find('.custom-p').exists()).toBe(true)
    expect(wrapper.find('p').exists()).toBe(false)
  })
})
