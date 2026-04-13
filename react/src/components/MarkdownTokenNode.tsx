import React, { createContext, useContext, useMemo } from 'react'
import type { StatefulToken } from '@markdown-stream/core'
import { defaultRenderers, registerMarkdownTokenNode } from '../renderers/default-renderers.js'
import type { MarkdownTokenComponentMap } from '../types/renderer.js'

export const ComponentsContext = createContext<Partial<MarkdownTokenComponentMap>>({})

/** Whether the parent MarkdownStream is actively consuming a stream. */
export const StreamingContext = createContext<boolean>(false)

/** Read whether the enclosing MarkdownStream is still streaming. */
export function useIsStreaming(): boolean {
  return useContext(StreamingContext)
}

interface MarkdownTokenNodeProps {
  token: StatefulToken
}

export function MarkdownTokenNode({ token }: MarkdownTokenNodeProps): React.ReactNode {
  const customComponents = useContext(ComponentsContext)

  const Comp = useMemo(
    () => customComponents[token.type] ?? defaultRenderers[token.type],
    [customComponents, token.type],
  )

  if (!Comp) {
    if (token.children?.length) {
      return (
        <>
          {token.children.map((child) => (
            <MarkdownTokenNode key={child.id} token={child} />
          ))}
        </>
      )
    }
    return token.content ?? null
  }

  return <Comp token={token} />
}

// Break circular dependency: tell default-renderers about this component
registerMarkdownTokenNode(MarkdownTokenNode)
