import type { StatefulToken } from '@markdown-stream/core'

export default function PinkHighlight({ token }: { token: StatefulToken }) {
  return (
    <span
      style={{
        backgroundColor: '#fce7f3',
        padding: '2px 4px',
        borderRadius: '3px',
        color: '#be185d',
        fontWeight: 500,
      }}
    >
      {token.content}
    </span>
  )
}
