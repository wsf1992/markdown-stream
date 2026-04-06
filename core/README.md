# @markdown-stream/core

基于 `markdown-it` 的流式 Markdown 解析核心库。支持流式输入，输出带状态（`start / streaming / done`）的结构化 token 树。

## 安装

```bash
npm install @markdown-stream/core
```

## 快速上手

### 一次性解析

```ts
import { createMarkdownProcessor } from '@markdown-stream/core'

const processor = createMarkdownProcessor()

const tokens = processor.parse('# Hello\n\nThis is a **paragraph**.')
// 所有 token 的 state 均为 'done'
```

输出示例：

```json
[
  {
    "id": "heading-0",
    "type": "heading",
    "state": "done",
    "meta": { "level": 1 },
    "children": [{ "id": "heading-0/text-0", "type": "text", "state": "done", "content": "Hello" }]
  },
  {
    "id": "paragraph-1",
    "type": "paragraph",
    "state": "done",
    "children": [
      { "id": "paragraph-1/text-0", "type": "text", "state": "done", "content": "This is a " },
      { "id": "paragraph-1/strong-1", "type": "strong", "state": "done", "content": "paragraph" }
    ]
  }
]
```

### 流式输入

```ts
import { createMarkdownProcessor } from '@markdown-stream/core'

const processor = createMarkdownProcessor()

// 模拟逐块写入（如 LLM 流式输出）
let changed

changed = processor.write('# Hello\n\n')
// [{ id: 'heading-0', type: 'heading', state: 'done', ... }]

changed = processor.write('This is a para')
// [{ id: 'paragraph-1', type: 'paragraph', state: 'start', ... }]

changed = processor.write('graph.')
// [{ id: 'paragraph-1', type: 'paragraph', state: 'streaming', ... }]

// 获取当前完整快照
const snapshot = processor.snapshot()

// 重置会话
processor.reset()
```

### write() 返回值说明

`write(chunk)` 仅返回**本次发生变化的顶层 block**，每个 token 携带完整子树：

| 情况 | state |
|------|-------|
| token 第一次出现 | `start` |
| token 内容发生变化 | `streaming` |
| token 之后还有其他 block（已完整） | `done` |
| 未变化的 token | 不包含在返回值中 |

`parse()` 场景下所有 token 直接输出 `done`。

## 数据模型

### TokenState

```ts
type TokenState = 'start' | 'streaming' | 'done'
```

### StatefulToken

```ts
interface StatefulToken {
  id: string                        // 稳定标识，流式过程中保持不变
  type: string                      // token 类型
  state: TokenState                 // 当前状态
  content?: string                  // 文本内容（叶子节点）
  children?: StatefulToken[]        // 子节点（block 内的 inline token）
  meta?: Record<string, unknown>    // 附加信息（如 heading level、fence lang）
  range?: { start: number; end: number }  // 在原始 markdown 中的行号范围
  raw?: RawToken                    // 原始 token（可选）
}
```

### 内置 token 类型

| type | 说明 | meta 字段 |
|------|------|-----------|
| `paragraph` | 段落 | — |
| `heading` | 标题 | `level: 1~6` |
| `fence` | 代码块 | `lang: string` |
| `blockquote` | 引用块 | — |
| `bullet_list` | 无序列表 | — |
| `ordered_list` | 有序列表 | — |
| `list_item` | 列表项 | — |
| `text` | 纯文本（inline） | — |
| `strong` | 加粗（inline） | — |
| `em` | 斜体（inline） | — |
| `link` | 链接（inline） | `href`, `title` |
| `code_inline` | 行内代码（inline） | — |
| `softbreak` | 软换行（inline） | — |

> inline token（`children` 内）不单独携带 state，其状态跟随所在 block。

### 流式计时字段

所有顶层 block token 的 `meta` 中会自动注入以下两个计时字段（由内部 diff 阶段写入，无需手动设置）：

| 字段 | 类型 | 写入时机 |
|------|------|----------|
| `streamStartTime` | `number`（毫秒时间戳） | token **首次出现**时记录，后续更新中保持不变 |
| `streamDoneTime` | `number`（毫秒时间戳） | token **状态变为 `done`** 时记录，streaming 阶段不存在此字段 |

典型用法——计算某个 token 从出现到完成的耗时：

```ts
const start = token.meta?.streamStartTime as number
const done = (token.meta?.streamDoneTime as number | undefined) ?? Date.now()
const elapsed = done - start  // 毫秒
```

> 这两个字段不参与内容相等性比较，不会因时间戳变化触发多余的 diff 输出。

## 自定义 token 类型

通过 `defineTokenType` + `use()` 注册自定义 token：

```ts
import { createMarkdownProcessor, defineTokenType } from '@markdown-stream/core'

const calloutType = defineTokenType({
  name: 'callout',

  // 匹配规则：返回 false 跳过，返回 { consumed } 表示消耗的 raw token 数量
  match(ctx) {
    const token = ctx.tokens[ctx.index]
    if (token.type === 'blockquote_open') {
      // 自定义逻辑：检查是否包含特定标记
      const nextInline = ctx.tokens[ctx.index + 2]
      if (nextInline?.content?.startsWith('[!')) {
        // 找到对应 close token 的位置
        let depth = 1, i = ctx.index + 1
        while (i < ctx.tokens.length) {
          if (ctx.tokens[i].type === 'blockquote_open') depth++
          if (ctx.tokens[i].type === 'blockquote_close' && --depth === 0) break
          i++
        }
        return { consumed: i - ctx.index + 1 }
      }
    }
    return false
  },

  // 构建输出 token
  build(ctx) {
    const consumed = ctx.matchResult.consumed
    const innerTokens = ctx.tokens.slice(ctx.index + 1, ctx.index + consumed - 1)
    const children = ctx.buildChildren(innerTokens, [...ctx.path, 'callout'])
    return {
      type: 'callout',
      children,
    }
  },

  // 可选：完成态判定（返回 true 表示可标记为 done）
  finalize(token, ctx) {
    return !ctx.isLast
  },
})

const processor = createMarkdownProcessor()
processor.use(calloutType)

// 或在创建时传入
const processor2 = createMarkdownProcessor({
  tokenTypes: [calloutType],
})
```

自定义 token 类型优先级高于内置类型。

## API 参考

### `createMarkdownProcessor(options?)`

创建一个 Markdown 处理器实例。

```ts
interface MarkdownProcessorOptions {
  tokenTypes?: TokenTypeDefinition[]  // 初始注册的自定义 token 类型
}
```

### `MarkdownProcessor`

| 方法 | 说明 |
|------|------|
| `parse(markdown)` | 一次性解析，返回完整 token 列表（均为 `done`） |
| `write(chunk)` | 追加输入，返回本次变化的 token |
| `snapshot()` | 返回当前完整 token 树（含 `streaming` 状态） |
| `reset()` | 清空当前会话和缓冲区 |
| `use(tokenType)` | 注册自定义 token 类型，支持链式调用 |

### `defineTokenType(def)`

类型辅助函数，提供 TypeScript 类型推导，直接返回传入的定义对象。

```ts
interface TokenTypeDefinition {
  name: string
  match(ctx: TokenMatchContext): boolean | TokenMatchResult
  build(ctx: TokenBuildContext): Omit<StatefulToken, 'id' | 'state'>
  finalize?(token: StatefulToken, ctx: FinalizeContext): boolean
}
```

## 典型使用场景

### 渲染 LLM 流式输出

```ts
const processor = createMarkdownProcessor()

// 接入 LLM stream
for await (const chunk of llmStream) {
  const changed = processor.write(chunk)
  for (const token of changed) {
    renderToken(token) // 根据 token.state 决定如何更新 UI
  }
}
```

### 与 React 结合（示意）

```tsx
function useMarkdownStream(stream: AsyncIterable<string>) {
  const [tokens, setTokens] = useState<Map<string, StatefulToken>>(new Map())
  const processor = useMemo(() => createMarkdownProcessor(), [])

  useEffect(() => {
    async function run() {
      for await (const chunk of stream) {
        const changed = processor.write(chunk)
        setTokens(prev => {
          const next = new Map(prev)
          for (const token of changed) {
            next.set(token.id, token)
          }
          return next
        })
      }
    }
    run()
  }, [stream])

  return [...tokens.values()]
}
```

## 内部架构

```
markdown-it
    ↓
MarkdownItAdapter   →  RawToken[]
    ↓
TokenAssembler      →  结构化 token（无 state）
    ↓
diffTokens          →  带状态的变化 token（start / streaming / done）
    ↑
StreamSession       （维护 buffer、prev snapshot、registry）
```

- **全量重解析 + diff**：每次 `write` 都对完整 buffer 重新解析，通过 diff 生成增量状态输出
- **稳定 ID**：基于 token 类型 + 层级路径 + 顺序生成，流式过程中保持不变
- **保守完成态**：非最后一个 block 优先标记 `done`，最后一个 block 保持 `streaming`
