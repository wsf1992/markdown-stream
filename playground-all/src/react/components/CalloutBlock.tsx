import { MarkdownTokenNode } from '@markdown-stream/react'
import type { StatefulToken } from '@markdown-stream/core'

const labels: Record<string, string> = {
  info: 'ℹ️ 提示',
  warning: '⚠️ 注意',
  danger: '🚨 危险',
}

export default function CalloutBlock({ token }: { token: StatefulToken }) {
  const kind = (token.meta?.kind as string) ?? 'info'
  return (
    <div className={`callout callout-${kind}`} data-state={token.state}>
      <div className="label">{labels[kind] ?? '提示'}</div>
      {token.children?.map((child) => (
        <MarkdownTokenNode key={child.id} token={child} />
      ))}
    </div>
  )
}
