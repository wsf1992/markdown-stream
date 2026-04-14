import React from 'react'
import { VueSfcFenceRenderer, SfcRendererPending } from '@markdown-stream/react'
import type { StatefulToken } from '@markdown-stream/core'

export default function VueSfcRenderer({ token }: { token: StatefulToken }) {
  if (token.state !== 'done') {
    return <SfcRendererPending />
  }

  return (
    <VueSfcFenceRenderer
      token={token}
      onError={(err) => console.warn('[VueSfcRenderer]', err)}
    />
  )
}
