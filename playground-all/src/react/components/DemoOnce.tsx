import { useState } from 'react'
import { MarkdownWithTokens } from '../tokens.js'
import TEMPLATE from '../tokens.md?raw'

export default function DemoOnce() {
  const [source, setSource] = useState(TEMPLATE)
  const [rendered, setRendered] = useState(TEMPLATE)

  return (
    <div>
      <div className="controls">
        <button className="run" onClick={() => setRendered(source)}>
          渲染
        </button>
      </div>
      <div className="panel">
        <div className="box">
          <h3>Markdown 输入</h3>
          <textarea
            value={source}
            rows={30}
            onChange={(e) => setSource(e.target.value)}
          />
        </div>
        <div className="box">
          <h3>渲染结果</h3>
          <MarkdownWithTokens content={rendered} debug />
        </div>
      </div>
    </div>
  )
}
