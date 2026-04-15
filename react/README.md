# @markdown-stream/react

[@markdown-stream/core](../core) 的 React 组件层。

## 安装

```bash
npm install @markdown-stream/react
```

引入样式（推荐）：

```ts
import '@markdown-stream/react/style.css'
```

---

## Props 参考

| Prop | 类型 | 说明 |
|------|------|------|
| `content` | `string \| AsyncIterable<string>` | 统一入口：字符串一次性渲染，`AsyncIterable` 流式渲染（推荐） |
| `components` | `CustomTokenDefinition[] \| Partial<MarkdownTokenComponentMap>` | 自定义 token 定义或渲染组件映射 |
| `tokenTypes` | `TokenTypeDefinition[]` | 传给核心库的自定义 token 类型 |
| `cursor` | `boolean` | 流式输出时显示打字光标，默认 `false` |
| `debug` | `boolean` | 在 console 打印 token 状态变化，默认 `false` |
| `className` | `string` | 附加到根容器的 className |

---

## 快速上手：统一 `content` prop

无需区分数据来源，直接传 `content`——字符串一次性渲染，`AsyncIterable` 流式渲染：

```tsx
import { MarkdownStream } from '@markdown-stream/react'

// 一次性字符串
const markdownString = '# Hello\n\nThis is **markdown**.'

// 或流式 AsyncIterable（来自 AI / SSE 等）
async function* aiStream() {
  yield '# Title\n\n'
  yield 'Streaming content...'
}

export default function App() {
  return (
    <>
      {/* 传字符串 */}
      <MarkdownStream content={markdownString} />

      {/* 传 AsyncIterable */}
      <MarkdownStream content={aiStream()} cursor />
    </>
  )
}
```

---

## 自定义 Token 与组件

通过 `components` 数组同时定义「如何解析」和「如何渲染」：

```ts
interface CustomTokenDefinition {
  name: string                        // token 类型名
  component?: ComponentType<{ token: StatefulToken }>  // 渲染组件
  openRegex?: string | RegExp        // 有此字段时自动注册解析规则
  closeRegex?: string | RegExp       // 配合 openRegex 匹配 open/close token 对
  contentRegex?: RegExp              // 匹配行内文本片段，捕获组内容作为 token.content 传入组件
}
```

### 覆盖已有 token 的渲染

只传 `name + component`，不改变解析逻辑：

```tsx
import { MarkdownStream } from '@markdown-stream/react'
import MyCodeBlock from './MyCodeBlock'
import MyHeading from './MyHeading'

export default function App() {
  return (
    <MarkdownStream
      content={markdown}
      components={[
        { name: 'fence',   component: MyCodeBlock },
        { name: 'heading', component: MyHeading   },
      ]}
    />
  )
}
```

### Fence 模式：匹配代码围栏的语言标识符

添加 `openRegex`，匹配 ` ``` ` 后的 info 字段：

````md
```warning
这是一段警告内容。
```
````

```tsx
<MarkdownStream
  content={markdown}
  components={[
    { name: 'warning', openRegex: /^warning$/, component: WarningBlock },
  ]}
/>
```

`WarningBlock` 通过 `token.content` 获取围栏内文本：

```tsx
import type { StatefulToken } from '@markdown-stream/react'

interface Props { token: StatefulToken }

export default function WarningBlock({ token }: Props) {
  return (
    <aside className="warning" data-state={token.state}>
      {token.content}
    </aside>
  )
}
```

### JSON 模式：解析 JSON 并展示图片

添加 `openRegex: /^json$/`，匹配 ` ```json ` 代码围栏，组件内解析 JSON 并展示图片：

````md
```json
{
  "img": "//example.com/image.jpg",
  "name": "示例图片"
}
```
````

```tsx
import { useMemo } from 'react'
import type { StatefulToken } from '@markdown-stream/react'

interface Props { token: StatefulToken }

export default function JsonBlock({ token }: Props) {
  const parsed = useMemo(() => {
    try { return JSON.parse(token.content || '') } catch { return null }
  }, [token.content])

  const imgUrl = parsed?.img
    ? (parsed.img.startsWith('//') ? 'https:' + parsed.img : parsed.img)
    : null

  if (!parsed) return <div className="json-loading">解析中...</div>

  return (
    <div className="json-block">
      {imgUrl && <img src={imgUrl} alt={parsed.name} />}
      <pre><code>{JSON.stringify(parsed, null, 2)}</code></pre>
    </div>
  )
}
```

使用方式：

```tsx
<MarkdownStream
  content={markdown}
  components={[
    { name: 'json', openRegex: /^json$/, component: JsonBlock },
  ]}
/>
```

---

## 内联 Token 拦截

除了代码块等块级 token，你还可以拦截行内（inline）语法。

### 覆盖已有内联 Token

直接用 `name` 指向已有内联 token，传入自定义 `component`，不改变任何解析逻辑：

| 内置名称 | 对应 Markdown 语法 |
|---|---|
| `strong` | `**加粗**` 或 `__加粗__` |
| `em` | `*斜体*` 或 `_斜体_` |
| `code_inline` | `` `行内代码` `` |

```tsx
<MarkdownStream
  content={markdown}
  components={[
    { name: 'strong', component: MyHighlight },
  ]}
/>
```

自定义组件通过 `token.children[0].content` 取得被包裹的文本：

```tsx
import type { StatefulToken } from '@markdown-stream/react'

export default function MyHighlight({ token }: { token: StatefulToken }) {
  return (
    <span style={{ background: '#fef08a', padding: '2px 4px', borderRadius: 3, color: '#854d0e' }}>
      {token.children?.[0]?.content}
    </span>
  )
}
```

效果：`**重要文字**` 将渲染为黄色高亮而不是加粗。

---

### contentRegex：自定义行内语法

使用 `contentRegex` 匹配任意行内文本片段，正则捕获组内容作为 `token.content` 传给组件。

**示例：将 `pink文字pink` 渲染为粉色高亮**

Markdown 原文：

```md
这段话里有一个 pink重要提示pink 需要特别关注。
```

注册配置：

```tsx
<MarkdownStream
  content={markdown}
  components={[
    {
      name: 'pink_highlight',
      contentRegex: /^pink(.+)pink$/,
      component: PinkHighlight,
    },
  ]}
/>
```

`PinkHighlight` 直接读取 `token.content`（已提取捕获组内容）：

```tsx
import type { StatefulToken } from '@markdown-stream/react'

export default function PinkHighlight({ token }: { token: StatefulToken }) {
  return (
    <span style={{ background: '#fce7f3', padding: '2px 4px', borderRadius: 3, color: '#be185d', fontWeight: 500 }}>
      {token.content}
    </span>
  )
}
```

---

### 同时使用多种内联拦截

```tsx
<MarkdownStream
  content={markdown}
  components={[
    { name: 'strong',        component: YellowHighlight },
    { name: 'em',            component: BlueItalic      },
    { name: 'code_inline',   component: StyledCode      },
    { name: 'pink_highlight', contentRegex: /^pink(.+)pink$/, component: PinkHighlight },
  ]}
/>
```

> **注意**：`contentRegex` 匹配 inline 内容时，正则捕获组（第一个括号）的内容会作为 `token.content` 传给组件。

---

## 流式计时字段

所有顶层 block token 的 `meta` 中会自动注入以下两个计时字段：

| 字段 | 类型 | 写入时机 |
|------|------|----------|
| `streamStartTime` | `number`（毫秒时间戳） | token **首次出现**时记录，后续更新中保持不变 |
| `streamDoneTime` | `number`（毫秒时间戳） | token **状态变为 `done`** 时记录，streaming 阶段不存在此字段 |

典型用法——在自定义组件中计算 token 从出现到完成的耗时：

```tsx
import { useState, useEffect } from 'react'
import type { StatefulToken } from '@markdown-stream/react'

export default function TimedBlock({ token }: { token: StatefulToken }) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (token.state === 'done') return
    const id = setInterval(() => setNow(Date.now()), 100)
    return () => clearInterval(id)
  }, [token.state])

  const start = token.meta?.streamStartTime as number | undefined
  const done = token.meta?.streamDoneTime as number | undefined
  const elapsed = start ? (done ?? now) - start : 0

  return (
    <div>
      {token.state === 'done' && (
        <span className="elapsed">生成耗时 {elapsed} ms</span>
      )}
    </div>
  )
}
```

> 这两个字段不参与内容相等性比较，不会因时间戳变化触发多余的重渲染。

---

## `VueSfcFenceRenderer` 组件

内置的 Vue SFC 渲染器，将代码围栏内的 Vue 单文件组件代码通过 iframe 实时渲染预览。它会在 iframe 内加载 Vue 3 + vue3-sfc-loader（CDN），支持 Tailwind CSS，并自动同步 iframe 高度、捕获运行时错误。

### 安装使用

直接将其注册为 `vue` 围栏的自定义组件：

````md
```vue
<template>
  <button class="px-4 py-2 bg-blue-500 text-white rounded">点击我</button>
</template>
````

```tsx
import { MarkdownStream, VueSfcFenceRenderer } from '@markdown-stream/react'

export default function App() {
  return (
    <MarkdownStream
      content={markdown}
      components={[
        { name: 'vue', openRegex: /^vue$/, component: VueSfcFenceRenderer },
      ]}
    />
  )
}
```

### Props 参考

| Prop | 类型 | 说明 |
|------|------|------|
| `token` | `StatefulToken` | 当前 token（由框架自动传入） |
| `metrics` | `VueSfcCardMetrics` | 外部注入的指标（优先级高于内部计算值） |
| `onError` | `(err: Error) => void` | 构建错误或运行时错误的回调 |
| `onRenderSuccess` | `(payload: { renderTime: number }) => void` | iframe 首次渲染成功的回调，`renderTime` 单位为毫秒 |
| `errorHandler` | `(err: Error) => void` | **已废弃**，请改用 `onError` |

#### `VueSfcCardMetrics`

```ts
interface VueSfcCardMetrics {
  tps?: number | null         // 字符/秒（外部传入则覆盖内部计算）
  totalChars?: number | null  // 总字符数
  elapsed?: number | null     // 生成耗时（秒）
  renderTime?: number | null  // 渲染耗时（毫秒）
}
```

### 功能说明

- **自动调整高度**：iframe 内容变化时通过 `postMessage` 通知父组件同步高度。
- **流式指标**：工具栏实时展示字符速率、总字符数、生成耗时、渲染耗时。
- **复制按钮**：一键复制 SFC 源码，复制后 2 秒内显示「已复制」。
- **错误上报**：iframe 构建失败（`VueSfcIframeBuildError`）和运行时错误（`VueSfcIframeRuntimeError`）均通过 `onError` 回调上报；未传入回调时打印到 `console.error`。

### 与外部指标集成

```tsx
import { VueSfcFenceRenderer } from '@markdown-stream/react'
import type { StatefulToken } from '@markdown-stream/react'

function MyVueBlock({ token }: { token: StatefulToken }) {
  const start = token.meta?.streamStartTime as number | undefined
  const done  = token.meta?.streamDoneTime  as number | undefined
  const elapsed = start ? ((done ?? Date.now()) - start) / 1000 : 0
  const tps = elapsed > 0 ? Math.round((token.content?.length ?? 0) / elapsed) : 0

  return (
    <VueSfcFenceRenderer
      token={token}
      metrics={{ tps, totalChars: token.content?.length, elapsed }}
      onError={(err) => console.error('SFC error', err)}
      onRenderSuccess={({ renderTime }) => console.log('rendered in', renderTime, 'ms')}
    />
  )
}
```

---

## `useMarkdownStream` Hook

底层 Hook，适合需要自行控制渲染逻辑的场景。

```ts
import { useMarkdownStream } from '@markdown-stream/react'

const {
  tokens,      // StatefulToken[] — 当前完整 token 树
  isStreaming, // boolean
  error,       // unknown
  parse,       // (markdown: string) => void — 一次性解析
  write,       // (chunk: string) => void — 追加输入
  consume,     // (stream: AsyncIterable<string>) => Promise<void>
  reset,       // () => void
  cancel,      // () => void — 取消当前流
} = useMarkdownStream({ debug: false })
```

```tsx
import { useEffect } from 'react'
import { useMarkdownStream } from '@markdown-stream/react'

export default function CustomRenderer() {
  const { tokens, isStreaming, consume } = useMarkdownStream()

  useEffect(() => {
    async function* aiStream() { /* ... */ }
    void consume(aiStream())
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      {tokens.map((token) => (
        <div key={token.id} data-state={token.state}>
          {/* 自定义渲染 */}
        </div>
      ))}
    </div>
  )
}
```

### 选项

| 选项 | 类型 | 说明 |
|------|------|------|
| `processor` | `MarkdownProcessor` | 传入自定义 processor 实例（不传则自动创建） |
| `tokenTypes` | `TokenTypeDefinition[]` | 注册自定义 token 类型 |
| `immediateSource` | `string` | 挂载时立即解析的 Markdown 字符串 |
| `debug` | `boolean` | 打印 token 状态变化日志 |
