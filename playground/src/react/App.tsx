import { useState } from 'react'
import DemoOnce from './components/DemoOnce.js'
import DemoStream from './components/DemoStream.js'
import DemoDocs from './components/DemoDocs.js'

const tabs = [
  { key: 'once',   label: '一次性渲染' },
  { key: 'stream', label: '流式渲染'   },
  { key: 'docs',   label: '📖 文档'    },
] as const

type Tab = typeof tabs[number]['key']

export default function App() {
  const [active, setActive] = useState<Tab>('once')

  return (
    <>
      <nav>
        {tabs.map((t) => (
          <button
            key={t.key}
            className={active === t.key ? 'active' : ''}
            onClick={() => setActive(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="page">
        {active === 'once'   && <DemoOnce />}
        {active === 'stream' && <DemoStream />}
        {active === 'docs'   && <DemoDocs />}
      </div>
    </>
  )
}
