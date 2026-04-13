import React from 'react'
import type { StatefulToken } from '@markdown-stream/core'
import type { MarkdownTokenComponentMap, TokenComponentProps } from '../types/renderer.js'

// Forward declaration — resolved at runtime to break the circular import
// between default-renderers and MarkdownTokenNode.
let MarkdownTokenNodeComponent: React.ComponentType<{ token: StatefulToken }> | null = null

export function registerMarkdownTokenNode(
  comp: React.ComponentType<{ token: StatefulToken }>
): void {
  MarkdownTokenNodeComponent = comp
}

function renderChildren(token: StatefulToken): React.ReactNode {
  if (!token.children?.length || !MarkdownTokenNodeComponent) return null
  const Node = MarkdownTokenNodeComponent
  return token.children.map((child) => <Node key={child.id} token={child} />)
}

function stateAttrs(token: StatefulToken): { 'data-state': string } {
  return { 'data-state': token.state }
}

export const defaultRenderers: MarkdownTokenComponentMap = {
  paragraph: ({ token }: TokenComponentProps) => (
    <p className="ms-token-paragraph" {...stateAttrs(token)}>
      {renderChildren(token)}
    </p>
  ),

  heading: ({ token }: TokenComponentProps) => {
    const level = (token.meta?.level as number) ?? 1
    const Tag = `h${Math.min(Math.max(level, 1), 6)}` as keyof React.JSX.IntrinsicElements
    return (
      <Tag
        className={`ms-token-heading ms-token-heading-${level}`}
        {...stateAttrs(token)}
      >
        {renderChildren(token)}
      </Tag>
    )
  },

  fence: ({ token }: TokenComponentProps) => (
    <pre className="ms-token-fence" {...stateAttrs(token)}>
      <code className={token.meta?.info ? `language-${token.meta.info}` : undefined}>
        {token.content ?? ''}
      </code>
    </pre>
  ),

  blockquote: ({ token }: TokenComponentProps) => (
    <blockquote className="ms-token-blockquote" {...stateAttrs(token)}>
      {renderChildren(token)}
    </blockquote>
  ),

  bullet_list: ({ token }: TokenComponentProps) => (
    <ul className="ms-token-bullet-list" {...stateAttrs(token)}>
      {renderChildren(token)}
    </ul>
  ),

  ordered_list: ({ token }: TokenComponentProps) => (
    <ol className="ms-token-ordered-list" {...stateAttrs(token)}>
      {renderChildren(token)}
    </ol>
  ),

  list_item: ({ token }: TokenComponentProps) => (
    <li className="ms-token-list-item" {...stateAttrs(token)}>
      {renderChildren(token)}
    </li>
  ),

  strong: ({ token }: TokenComponentProps) => (
    <strong className="ms-token-strong" {...stateAttrs(token)}>
      {renderChildren(token)}
    </strong>
  ),

  em: ({ token }: TokenComponentProps) => (
    <em className="ms-token-em" {...stateAttrs(token)}>
      {renderChildren(token)}
    </em>
  ),

  link: ({ token }: TokenComponentProps) => (
    <a
      className="ms-token-link"
      href={token.meta?.href as string | undefined}
      title={token.meta?.title as string | undefined}
      {...stateAttrs(token)}
    >
      {renderChildren(token)}
    </a>
  ),

  code_inline: ({ token }: TokenComponentProps) => (
    <code className="ms-token-code-inline" {...stateAttrs(token)}>
      {token.content ?? ''}
    </code>
  ),

  softbreak: (_props: TokenComponentProps) => <br />,

  text: ({ token }: TokenComponentProps) => <>{token.content ?? ''}</>,

  image: ({ token }: TokenComponentProps) => (
    <img
      className="ms-token-image"
      src={token.meta?.src as string | undefined}
      alt={token.meta?.alt as string | undefined}
      title={token.meta?.title as string | undefined}
      {...stateAttrs(token)}
    />
  ),

  inline: ({ token }: TokenComponentProps) => <>{renderChildren(token)}</>,

  table: ({ token }: TokenComponentProps) => (
    <table className="ms-token-table" {...stateAttrs(token)}>
      {renderChildren(token)}
    </table>
  ),

  thead: ({ token }: TokenComponentProps) => (
    <thead className="ms-token-thead" {...stateAttrs(token)}>
      {renderChildren(token)}
    </thead>
  ),

  tbody: ({ token }: TokenComponentProps) => (
    <tbody className="ms-token-tbody" {...stateAttrs(token)}>
      {renderChildren(token)}
    </tbody>
  ),

  tr: ({ token }: TokenComponentProps) => (
    <tr className="ms-token-tr" {...stateAttrs(token)}>
      {renderChildren(token)}
    </tr>
  ),

  th: ({ token }: TokenComponentProps) => (
    <th
      className="ms-token-th"
      style={token.meta?.align ? { textAlign: token.meta.align as React.CSSProperties['textAlign'] } : undefined}
      {...stateAttrs(token)}
    >
      {renderChildren(token)}
    </th>
  ),

  td: ({ token }: TokenComponentProps) => (
    <td
      className="ms-token-td"
      style={token.meta?.align ? { textAlign: token.meta.align as React.CSSProperties['textAlign'] } : undefined}
      {...stateAttrs(token)}
    >
      {renderChildren(token)}
    </td>
  ),
}
