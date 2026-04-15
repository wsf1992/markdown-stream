import React from 'react'
import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MarkdownTokenNode, ComponentsContext } from '../src/components/MarkdownTokenNode.js'
import type { StatefulToken } from '@markdown-stream/core'
import type { TokenComponentProps } from '../src/types/renderer.js'

function makeToken(overrides: Partial<StatefulToken> & { type: string }): StatefulToken {
  return {
    id: overrides.type + '-1',
    state: 'done',
    ...overrides,
  }
}

describe('MarkdownTokenNode', () => {
  it('renders heading with correct tag level', () => {
    const token = makeToken({
      type: 'heading',
      meta: { level: 2 },
      children: [makeToken({ type: 'text', content: 'Title' })],
    })
    const { container } = render(<MarkdownTokenNode token={token} />)
    expect(container.querySelector('h2')).toBeTruthy()
    expect(container.querySelector('h2')?.textContent).toContain('Title')
  })

  it('renders paragraph', () => {
    const token = makeToken({
      type: 'paragraph',
      children: [makeToken({ type: 'text', content: 'Hello' })],
    })
    const { container } = render(<MarkdownTokenNode token={token} />)
    expect(container.querySelector('p')).toBeTruthy()
  })

  it('renders bullet_list > list_item', () => {
    const token = makeToken({
      type: 'bullet_list',
      children: [
        makeToken({
          type: 'list_item',
          children: [makeToken({ type: 'text', content: 'Item 1' })],
        }),
      ],
    })
    const { container } = render(<MarkdownTokenNode token={token} />)
    expect(container.querySelector('ul')).toBeTruthy()
    expect(container.querySelector('li')).toBeTruthy()
  })

  it('renders fence as pre > code', () => {
    const token = makeToken({ type: 'fence', content: 'const x = 1', meta: { info: 'js' } })
    const { container } = render(<MarkdownTokenNode token={token} />)
    expect(container.querySelector('pre')).toBeTruthy()
    expect(container.querySelector('code')).toBeTruthy()
    expect(container.querySelector('code')?.textContent).toBe('const x = 1')
  })

  it('renders link with href and title', () => {
    const token = makeToken({
      type: 'link',
      meta: { href: 'https://example.com', title: 'Example' },
      children: [makeToken({ type: 'text', content: 'Click' })],
    })
    const { container } = render(<MarkdownTokenNode token={token} />)
    const a = container.querySelector('a')
    expect(a).toBeTruthy()
    expect(a?.getAttribute('href')).toBe('https://example.com')
    expect(a?.getAttribute('title')).toBe('Example')
  })

  it('exposes data-state attribute', () => {
    const token = makeToken({ type: 'paragraph', state: 'streaming', children: [] })
    const { container } = render(<MarkdownTokenNode token={token} />)
    expect(container.querySelector('p')?.getAttribute('data-state')).toBe('streaming')
  })

  it('uses custom component when provided via ComponentsContext', () => {
    const CustomHeading = (_props: TokenComponentProps) => (
      <div className="custom-heading">custom</div>
    )
    const token = makeToken({ type: 'heading', meta: { level: 1 }, children: [] })

    const { container } = render(
      <ComponentsContext.Provider value={{ heading: CustomHeading }}>
        <MarkdownTokenNode token={token} />
      </ComponentsContext.Provider>
    )

    expect(container.querySelector('.custom-heading')).toBeTruthy()
    expect(container.querySelector('h1')).toBeFalsy()
  })

  it('renders softbreak as br', () => {
    const token = makeToken({ type: 'softbreak' })
    const { container } = render(<MarkdownTokenNode token={token} />)
    expect(container.querySelector('br')).toBeTruthy()
  })

  it('renders code_inline as code', () => {
    const token = makeToken({ type: 'code_inline', content: 'let x' })
    const { container } = render(<MarkdownTokenNode token={token} />)
    expect(container.querySelector('code')?.textContent).toBe('let x')
  })
})
