import React from 'react'
import { render, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MarkdownStream } from '../src/components/MarkdownStream.js'
import type { StatefulToken } from '@markdown-stream/core'
import type { TokenComponentProps } from '../src/types/renderer.js'

function makeComp(tag: string, cls: string) {
  return function CustomComp({ token }: TokenComponentProps) {
    const content =
      token.content ??
      (token.meta?.info as string | undefined) ??
      token.children?.map((c) => c.content).join('') ??
      ''
    return React.createElement(tag, { className: cls }, content)
  }
}

describe('components 数组格式', () => {
  it('覆盖已有 token 渲染（无 openRegex）', async () => {
    const { container } = render(
      <MarkdownStream
        content="# Title"
        components={[{ name: 'heading', component: makeComp('div', 'custom-h') }]}
      />
    )
    await waitFor(() => {
      expect(container.querySelector('.custom-h')).toBeTruthy()
      expect(container.querySelector('h1')).toBeFalsy()
    })
  })

  it('fence 模式：openRegex 匹配 info 字段', async () => {
    const { container } = render(
      <MarkdownStream
        content={'```warning\nAlert content\n```'}
        components={[
          { name: 'warning', openRegex: /^warning/, component: makeComp('aside', 'warning-block') },
        ]}
      />
    )
    await waitFor(() => {
      expect(container.querySelector('.warning-block')).toBeTruthy()
      expect(container.querySelector('.warning-block')?.textContent?.trim()).toBe('Alert content')
    })
  })

  it('fence 模式：openRegex 字符串形式', async () => {
    const { container } = render(
      <MarkdownStream
        content={'```tip\nHello tip\n```'}
        components={[{ name: 'tip', openRegex: '^tip', component: makeComp('div', 'tip-block') }]}
      />
    )
    await waitFor(() => {
      expect(container.querySelector('.tip-block')).toBeTruthy()
    })
  })

  it('未命中的 token 仍使用默认渲染', async () => {
    const { container } = render(
      <MarkdownStream
        content={'# Heading\n\n```warning\ncontent\n```'}
        components={[
          { name: 'warning', openRegex: /^warning/, component: makeComp('aside', 'warning-block') },
        ]}
      />
    )
    await waitFor(() => {
      expect(container.querySelector('h1')).toBeTruthy()
      expect(container.querySelector('.warning-block')).toBeTruthy()
    })
  })

  it('多个自定义 token 同时生效', async () => {
    const { container } = render(
      <MarkdownStream
        content={'```tip\nTip content\n```\n\n```warning\nWarn content\n```'}
        components={[
          { name: 'tip', openRegex: /^tip$/, component: makeComp('div', 'tip') },
          { name: 'warning', openRegex: /^warning$/, component: makeComp('div', 'warn') },
        ]}
      />
    )
    await waitFor(() => {
      expect(container.querySelector('.tip')).toBeTruthy()
      expect(container.querySelector('.warn')).toBeTruthy()
    })
  })
})
