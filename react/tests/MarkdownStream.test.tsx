import React from 'react'
import { render, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MarkdownStream } from '../src/components/MarkdownStream.js'

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
})
