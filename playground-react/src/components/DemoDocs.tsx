import { MarkdownStream } from '@markdown-stream/react'
import README from '../../../react/README.md?raw'

export default function DemoDocs() {
  return (
    <div className="box">
      <h3>📖 @markdown-stream/react 文档</h3>
      <MarkdownStream content={README} />
    </div>
  )
}
