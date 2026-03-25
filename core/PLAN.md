# markdown-stream 核心库计划

## 目标

基于 `markdown-it` 构建一个核心库，提供以下能力：

1. 支持自定义 token 类型。
2. 输出带状态的 token，状态包括：
   - `start`：开始渲染
   - `streaming`：流式渲染中
   - `done`：流式渲染完成
3. 将 `markdown-it` 的扁平 token 序列（如 `open + inline + close`）合并为一个结构化 token。
4. 支持流式输入与流式输出。

## 核心设计

建议将库拆成两层：

1. `markdown-it -> 结构化 token`
2. `结构化 token -> 带状态的流式 token`

这样可以把“解析”和“流式状态管理”分开，后续扩展自定义 token 类型也更稳定。

## 数据模型

建议定义两套 token：

### 1. RawToken

直接承接 `markdown-it` 输出，用于保留原始信息。

建议字段：

- `type`
- `tag`
- `nesting`
- `content`
- `attrs`
- `map`
- `children`
- `meta`

### 2. StatefulToken

这是对外输出的核心结构。

建议字段：

- `id`：稳定标识，用于流式 diff
- `type`：组合后的 token 类型
- `state`：`start | streaming | done`
- `content`
- `children`
- `meta`
- `range`
- `raw`

## 模块拆分

建议目录结构：

```text
src/
  parser/
    markdown-it-adapter.ts
  core/
    token-assembler.ts
    token-registry.ts
    token-diff.ts
    stream-session.ts
  types/
    token.ts
    state.ts
tests/
```

各模块职责如下：

- `markdown-it-adapter`：封装 `markdown-it`，统一输出原始 token。
- `token-assembler`：将 `open + inline + close` 合并为结构化 token。
- `token-registry`：支持自定义 token 类型注册与构建。
- `token-diff`：对比前后两次解析结果，生成状态变化。
- `stream-session`：维护流式输入 buffer 和会话状态。

## 对外接口设计

核心库对外只暴露一个统一的 `Processor`，同时提供两种输入方式：

- `parse(markdown)`：一次性输入完整 markdown
- `write(chunk)`：流式追加输入 chunk

不要求调用方显式标记“流是否结束”，因此不提供 `{ done: true }`、`end()` 或 `complete()` 这类结束信号接口。

建议导出：

```ts
export { createMarkdownProcessor, defineTokenType }

export type {
  MarkdownProcessor,
  MarkdownProcessorOptions,
  TokenTypeDefinition,
  StatefulToken,
  TokenState,
}
```

建议接口形状：

```ts
type TokenState = 'start' | 'streaming' | 'done'

interface StatefulToken {
  id: string
  type: string
  state: TokenState
  content?: string
  children?: StatefulToken[]
  meta?: Record<string, unknown>
  range?: {
    start: number
    end: number
  }
  raw?: RawToken
}

interface MarkdownProcessorOptions {
  setupMarkdownIt?: (md: MarkdownIt) => void
  tokenTypes?: TokenTypeDefinition[]
}

interface MarkdownProcessor {
  parse(markdown: string): StatefulToken[]
  write(chunk: string): StatefulToken[]
  snapshot(): StatefulToken[]
  reset(): void
  use(tokenType: TokenTypeDefinition): this
}

interface TokenTypeDefinition {
  name: string
  match(ctx: TokenMatchContext): boolean | TokenMatchResult
  build(ctx: TokenBuildContext): StatefulToken
  finalize?(token: StatefulToken, ctx: FinalizeContext): boolean
}
```

接口语义：

- `parse(markdown)`：一次性输入并返回完整结果；通常可直接输出 `done` token
- `write(chunk)`：流式追加输入，返回本次新增或状态变化的 token（见下方"返回值粒度"）
- `snapshot()`：返回当前流式会话下的完整 token 树（含当前 `streaming` 状态）
- `reset()`：清空当前处理会话
- `use()`：注册自定义 token 类型

### write() 返回值粒度

`write(chunk)` 返回的是**顶层变化的 block**，而不是细粒度的 inline diff：

- 仅返回本次 diff 中状态发生变化的顶层 token（新增、内容变化、状态变化）
- 每个返回的 token 携带其**完整子树**（包含最新的 inline children）
- 未发生变化的顶层 token 不包含在返回值中
- 若需要完整当前状态，使用 `snapshot()`

```ts
// 示例：第一次 write 新增了 paragraph，第二次 write 该 paragraph 内容变化
const p1 = processor.write('Hello') // [{ id: 'p0', type: 'paragraph', state: 'start', ... }]
const p2 = processor.write(', world') // [{ id: 'p0', type: 'paragraph', state: 'streaming', ... }]
```

### finalize 调用时机

`TokenTypeDefinition.finalize?` 的调用规则：

- `parse()` 路径：在所有 token 构建完成后，对每个 token 调用一次 `finalize`
- `write()` 路径：每次 diff 后，对**非最后一个 block** 调用 `finalize`（最后一个 block 仍可能变化，不调用）
- `finalize` 返回 `true` 表示该 token 可标记为 `done`，返回 `false` 维持原状态不变

### inline 子节点的状态

v1 中 inline 子节点**不单独携带 state**，遵循以下规则：

- `children` 中的 inline token（`strong`、`em`、`link`、`code_inline` 等）不设 `state` 字段（或始终为 `done`）
- inline token 的状态跟随其所在 block 的状态：block 处于 `streaming`，调用方应将其所有 inline children 视为不稳定
- 只有 block 级 token 参与 diff 和状态流转
- v2 再考虑 inline 级别的细粒度状态

不建议在 v1 直接对外暴露以下底层接口：

- `parseRaw()`
- `assembleTokens()`
- `diffTokens()`
- `TokenRegistry`

## 关键能力拆解

### 1. Token 组合器

先实现一个 `TokenAssembler`，负责把扁平 token 转成结构化 token。

建议使用栈式归并：

- 遇到 `*_open`：入栈
- 遇到 `inline`：挂到当前节点
- 遇到 `*_close`：出栈并生成组合 token

v1 优先支持以下 block：

- `paragraph`
- `heading`
- `blockquote`
- `bullet_list`
- `ordered_list`
- `list_item`
- `fence`

### 2. 自定义 token 类型

不要把 token 类型写死，建议提供 `TokenTypeRegistry`。

注册接口可包含：

- `name`：类型名
- `match(tokens, ctx)`：匹配规则
- `build(matchResult, ctx)`：构建输出 token
- `finalize?(token, ctx)`：补充完成态判定

这样可以支持：

- 自定义 block token
- 自定义 inline token
- 二次聚合 token

### 3. 状态化输出

统一输出三种状态：

- `start`
- `streaming`
- `done`

建议规则：

- token 第一次出现时输出 `start`
- 同一 token 内容仍在变化时输出 `streaming`
- token 被确认结束时输出 `done`

## 流式处理方案

`markdown-it` 本身不是增量解析器，因此 v1 建议采用“全量重解析 + diff”方案。

### 流式会话 API

建议提供：

- `parse(markdown)`
- `write(chunk)`
- `snapshot()`
- `reset()`

### 内部流程

每次 `write(chunk)` 时：

1. 将 chunk 追加到 buffer
2. 用 `markdown-it` 全量解析当前 buffer
3. 通过 `TokenAssembler` 生成结构化 token
4. 对比上一次 token 结果
5. 生成新的状态化 token 输出

### 稳定 ID 策略

为支持流式 diff，需要给组合后的 token 生成稳定 `id`。

建议参考以下信息组合生成：

- token 类型
- 层级路径
- 在父节点中的顺序
- 起始位置或逻辑 range

目标是保证同一个 token 在流式追加过程中尽量保持同一个 `id`。

## 完成态判定

完成态是流式设计中的重点，v1 建议采用保守策略：

- 在 `parse(markdown)` 场景下，输出的完整 token 可直接标记为 `done`
- 在 `write(chunk)` 场景下，除最后一个仍可能变化的 block 外，前面的 token 优先标记为 `done`
- 最后一个正在追加内容的 block 标记为 `streaming`
- 由于不提供显式结束信号，流式场景中的最后一个未闭合 token 可能持续保持 `streaming`

以下结构需要重点验证：

- 跨 chunk 的段落
- 跨 chunk 的强调或链接
- 跨 chunk 的代码块
- 持续追加的列表项
- 引用块和嵌套列表

## 实施阶段

### 第一阶段：静态解析打底

目标：

- 接入 `markdown-it`
- 定义 `RawToken` 和 `StatefulToken`
- 实现基础 `TokenAssembler`
- 先在非流式场景下输出组合 token

产出：

- 静态输入可生成结构化 token
- `open + inline + close` 合并逻辑跑通

### 第二阶段：自定义 token 注册

目标：

- 实现 `TokenTypeRegistry`
- 支持外部注册自定义 token 类型
- 支持默认类型和自定义类型共存

产出：

- 可插拔的 token 扩展机制

### 第三阶段：流式状态机

目标：

- 实现 `StreamSession`
- 支持 `parse` / `write` / `snapshot` / `reset`
- 基于 diff 输出 `start / streaming / done`

产出：

- 一次性输入与追加式流式输入都可工作
- 同一 token 在流式过程中状态变化正确

### 第四阶段：测试与优化

目标：

- 补齐测试矩阵
- 验证 token `id` 稳定性
- 优化流式输出行为
- 视情况考虑局部重解析

产出：

- 可发布的 v1

## 测试计划

优先覆盖以下场景：

- `parse(markdown)` 一次性输入返回完整 `done` token
- 普通段落被拆成多个 chunk 输入
- 标题在输入完成前后的状态变化
- 强调、链接、代码块跨 chunk
- 列表和引用块持续追加
- 自定义 token 类型注册与输出
- 同一 token 在流式过程中的 `id` 是否稳定
- `start -> streaming -> done` 是否符合预期
- 未提供显式结束信号时，尾部 token 是否保持合理的 `streaming` 状态

## v1 范围建议

为了尽快落地，建议先控制范围：

1. 先支持“仅追加”的流式输入，不处理任意位置编辑。
2. 先做好 block 级 token，再逐步细化 inline 级别状态。
3. 先用全量重解析 + diff 保证正确性，再做性能优化。

## 里程碑

1. 完成静态组合 token 能力
2. 完成自定义 token 注册机制
3. 完成流式状态 token 输出
4. 完成测试、文档和性能优化

## 当前默认假设

当前仓库基本为空，因此本计划默认按“从零搭建 TypeScript 核心库”来设计。
