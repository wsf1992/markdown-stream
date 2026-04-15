import type { StatefulToken } from '@markdown-stream/core'

function CodeSkeleton() {
  return <div className="skeleton" />
}

function CodeStreaming({ token }: { token: StatefulToken }) {
  return (
    <pre style={{ position: 'relative' }} className="ms-root">
      <code>{token.content}</code>
      <span style={{ position: 'absolute', right: 10, top: 8, fontSize: 11, opacity: 0.5 }}>
        输入中…
      </span>
    </pre>
  )
}

function CodeBlock({ token }: { token: StatefulToken }) {
  const lang = (token.meta?.info as string) || 'code'
  return (
    <div className="code-block">
      <div className="code-header">
        <div className="mac-dots">
          <span className="dot dot-red" />
          <span className="dot dot-yellow" />
          <span className="dot dot-green" />
        </div>
        <span className="code-lang">{lang}</span>
      </div>
      <pre className="code-content">
        <code>{token.content}</code>
      </pre>
    </div>
  )
}

export default function CodeFenceRenderer({ token }: { token: StatefulToken }) {
  if (token.state === 'start') return <CodeSkeleton />
  if (token.state === 'streaming') return <CodeStreaming token={token} />
  return <CodeBlock token={token} />
}
