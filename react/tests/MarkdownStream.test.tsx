import React from 'react'
import { render, waitFor, act } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MarkdownStream } from '../src/components/MarkdownStream.js'
import type { StatefulToken } from '@markdown-stream/core'
import type { TokenComponentProps } from '../src/types/renderer.js'

async function* makeStream(): AsyncIterable<string> {
  yield '# Title\n'
  await new Promise((resolve) => setTimeout(resolve, 10))
  yield '\nParagraph **bold**\n'
}

describe('MarkdownStream', () => {
  it('preserves streaming markdown when mounted in StrictMode', async () => {
    const { container } = render(
      <React.StrictMode>
        <MarkdownStream content={makeStream()} />
      </React.StrictMode>
    )

    await waitFor(() => {
      expect(container.querySelector('h1')?.textContent).toBe('Title')
      expect(container.querySelector('p')?.textContent).toBe('Paragraph bold')
      expect(container.querySelector('strong')?.textContent).toBe('bold')
    })
  })

  it('renders heading from string content', async () => {
    const { container } = render(<MarkdownStream content="# Hello World" />)
    await waitFor(() => {
      expect(container.querySelector('h1')).toBeTruthy()
      expect(container.querySelector('h1')?.textContent).toBe('Hello World')
    })
  })

  it('renders paragraph from string content', async () => {
    const { container } = render(<MarkdownStream content="Simple paragraph." />)
    await waitFor(() => {
      expect(container.querySelector('p')?.textContent).toBe('Simple paragraph.')
    })
  })

  it('renders blockquote', async () => {
    const { container } = render(<MarkdownStream content="> A quote" />)
    await waitFor(() => {
      expect(container.querySelector('blockquote')).toBeTruthy()
    })
  })

  it('renders ordered list', async () => {
    const { container } = render(<MarkdownStream content={'1. Item A\n2. Item B'} />)
    await waitFor(() => {
      expect(container.querySelector('ol')).toBeTruthy()
      expect(container.querySelectorAll('li').length).toBe(2)
    })
  })

  it('renders fenced code block', async () => {
    const { container } = render(<MarkdownStream content={'```js\nconsole.log(1)\n```'} />)
    await waitFor(() => {
      expect(container.querySelector('pre')).toBeTruthy()
      expect(container.querySelector('code')).toBeTruthy()
    })
  })

  it('has ms-root class on root element', async () => {
    const { container } = render(<MarkdownStream content="# Hi" />)
    await waitFor(() => {
      expect(container.querySelector('.ms-root')).toBeTruthy()
    })
  })

  it('applies custom className to root element', async () => {
    const { container } = render(<MarkdownStream content="Hi" className="my-class" />)
    await waitFor(() => {
      const root = container.querySelector('.ms-root')
      expect(root?.classList.contains('my-class')).toBe(true)
    })
  })

  it('uses custom component override via Record format', async () => {
    const CustomParagraph = ({ token }: TokenComponentProps) => (
      <section className="custom-p">{token.children?.[0]?.content ?? ''}</section>
    )

    const { container } = render(
      <MarkdownStream
        content="Hello world"
        components={{ paragraph: CustomParagraph }}
      />
    )
    await waitFor(() => {
      expect(container.querySelector('.custom-p')).toBeTruthy()
      expect(container.querySelector('p')).toBeFalsy()
    })
  })

  it('renders from async stream', async () => {
    async function* stream() {
      yield '# Streaming'
      yield '\n\nContent'
    }

    const { container } = render(<MarkdownStream content={stream()} />)
    await waitFor(() => {
      expect(container.querySelector('h1')).toBeTruthy()
    })
  })

  it('displays error message when stream throws', async () => {
    async function* failingStream() {
      yield '# Start'
      throw new Error('stream failure')
    }

    const { container } = render(<MarkdownStream content={failingStream()} />)
    await waitFor(() => {
      const alert = container.querySelector('[role="alert"]')
      expect(alert?.textContent).toContain('stream failure')
    })
  })
})
