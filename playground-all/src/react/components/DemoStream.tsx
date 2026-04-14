import { useState, useRef } from 'react'
import { MarkdownWithTokens } from '../tokens.js'
import TEMPLATE from '../tokens.md?raw'

const CHUNKS = TEMPLATE.split('\n')

async function* makeStream(ms: number): AsyncIterable<string> {
  for (const chunk of CHUNKS) {
    await new Promise((r) => setTimeout(r, ms))
    yield chunk + '\n'
  }
}

export default function DemoStream() {
  const [delay, setDelay] = useState(200)
  const [stream, setStream] = useState<AsyncIterable<string> | undefined>()
  const [isRunning, setIsRunning] = useState(false)
  // key 用于强制重建 MarkdownStream（切换新流时重置组件内部状态）
  const keyRef = useRef(0)
  const [key, setKey] = useState(0)

  function start() {
    setIsRunning(true)
    setStream(undefined)
    setTimeout(() => {
      keyRef.current += 1
      setKey(keyRef.current)
      setStream(makeStream(delay))
      setIsRunning(false)
    }, 50)
  }

  return (
    <div>
      <div className="controls">
        <button className="run" disabled={isRunning} onClick={start}>
          ▶ 开始流式输出
        </button>
        <label>
          延迟
          <input
            type="range"
            value={delay}
            min={80}
            max={500}
            onChange={(e) => setDelay(Number(e.target.value))}
          />
          {delay}ms
        </label>
      </div>
      <div className="box">
        <h3>渲染结果（含所有自定义 Token）</h3>
        {stream ? (
          <MarkdownWithTokens key={key} content={stream} cursor />
        ) : (
          <p style={{ color: '#9ca3af', fontSize: 13 }}>点击按钮开始流式渲染</p>
        )}
      </div>
    </div>
  )
}
