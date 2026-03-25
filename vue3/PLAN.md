# markdown-stream Vue 3 组件层计划

## 目标

在现有 `@markdown-stream/core` 之上新增 Vue 3 组件层，提供开箱即用的响应式接入能力和默认渲染能力，同时保持核心层的无框架定位不变。

Vue 3 组件层 v1 需要覆盖以下能力：

1. 支持一次性渲染完整 Markdown。
2. 支持消费流式 chunk，并随着 `start / streaming / done` 状态更新视图。
3. 提供 composable，方便业务侧按需接入。
4. 提供默认组件渲染器，覆盖 core 已支持的内置 token。
5. 提供自定义渲染扩展点，允许业务层覆写部分 token 的显示方式。
6. 不把解析、diff、token 组装逻辑重新复制到 Vue 层。

## 设计原则

1. `core` 负责解析与状态管理，`vue3` 负责响应式封装与渲染。
2. Vue 层尽量薄，避免形成第二套状态机。
3. 优先做稳定的默认能力，再考虑 SSR、主题、代码高亮等增强项。
4. 默认渲染使用语义化 HTML，样式保持轻量，不强耦合 UI 框架。
5. 可扩展能力优先通过 composable 和 renderer 映射暴露，而不是过早引入复杂插件体系。

## 包结构建议

建议将 Vue 3 组件层作为与 `core` 平级的独立包维护：

```text
vue3/
  src/
    index.ts
    composables/
      use-markdown-stream.ts
    components/
      MarkdownStream.vue
      MarkdownTokenNode.vue
    renderers/
      default-renderers.ts
    types/
      props.ts
      renderer.ts
  tests/
    use-markdown-stream.test.ts
    markdown-stream.test.ts
    token-node.test.ts
  package.json
  tsconfig.json
  README.md
  PLAN.md
```

## 对外能力规划

### 1. composable

建议提供：

```ts
function useMarkdownStream(options?: UseMarkdownStreamOptions): {
  tokens: Ref<StatefulToken[]>
  isStreaming: Ref<boolean>
  error: Ref<unknown>
  parse: (markdown: string) => void
  write: (chunk: string) => void
  reset: () => void
  cancel: () => void
  consume: (stream: AsyncIterable<string>) => Promise<void>
}
```

建议选项：

```ts
interface UseMarkdownStreamOptions {
  processor?: MarkdownProcessor
  tokenTypes?: TokenTypeDefinition[]
  immediateSource?: string
}
```

说明：

1. 默认内部创建 `createMarkdownProcessor()`。
2. 如果业务方传入 `processor`，则复用外部实例。
3. `consume()` 用于消费异步流。
4. `tokens` 始终暴露完整快照，而不是仅暴露 diff。
5. `write()` 与 `parse()` 对外返回 `void`，内部消费 core 返回值后同步刷新 `tokens.value = processor.snapshot()`。直接透传 core 的 diff 返回值容易被调用方误用（core 的 `write()` 返回 diff 而非完整快照）。
6. `cancel()` 用于主动取消当前进行中的 `consume()`，推进内部 runId 使旧流写入失效。
7. `reset()` 内部先调用 `cancel()`，再清空 core 状态与响应式状态。

### 2. 根组件

建议提供：

```ts
interface MarkdownStreamProps {
  source?: string
  stream?: AsyncIterable<string>
  tokenTypes?: TokenTypeDefinition[]
  components?: Partial<MarkdownTokenComponentMap>
}
```

组件职责：

1. 接收 `source` 时走一次性解析。
2. 接收 `stream` 时消费异步流并更新视图。
3. 内部使用 `useMarkdownStream()`，不重复持有独立解析状态。
4. 将 token 树交给递归组件渲染。

### 3. 递归渲染组件

建议新增 `MarkdownTokenNode.vue`：

1. 输入单个 `StatefulToken`。
2. 根据 `token.type` 路由到默认渲染器或用户自定义渲染器。
3. 对 block 和 inline token 统一递归处理。
4. 透出 `token.state` 相关 class 或 data attribute，方便业务侧做 streaming 态样式。

### 4. 自定义渲染能力

建议采用 `components` 映射而不是复杂插件：

```ts
type MarkdownTokenComponentMap = Record<string, Component>
```

行为约定：

1. 命中自定义组件时，优先使用自定义组件。
2. 未命中时回退到默认渲染。
3. 自定义组件至少接收 `token`。
4. 如需递归渲染子节点，可同时注入统一的子节点渲染能力。

## 默认渲染范围

v1 覆盖当前 core 已支持的内置 token：

1. `paragraph`
2. `heading`
3. `fence`
4. `blockquote`
5. `bullet_list`
6. `ordered_list`
7. `list_item`
8. `text`
9. `strong`
10. `em`
11. `link`
12. `code_inline`
13. `softbreak`
14. `inline`

建议默认映射：

1. `paragraph -> p`
2. `heading -> h1 ~ h6`
3. `blockquote -> blockquote`
4. `bullet_list -> ul`
5. `ordered_list -> ol`
6. `list_item -> li`
7. `strong -> strong`
8. `em -> em`
9. `link -> a`
10. `code_inline -> code`
11. `fence -> pre > code`
12. `softbreak -> br`
13. `text -> 纯文本节点`
14. `inline -> Fragment`（注意：Vue 3 中需从 vue 导入 `Fragment` 并用 `h(Fragment, null, children)` 渲染，不能用字符串 tag，`MarkdownTokenNode` 需对此单独分支处理）

## 分阶段实施

### 阶段一：包脚手架与导出面

目标：

1. 建立 `vue3` 独立包结构。
2. 配置 TypeScript、构建、测试基础设施。
3. 明确 `index.ts` 导出面。

任务：

1. 新增 `vue3/package.json`，声明 `vue` 与 `@markdown-stream/core` 为 peer/dev 依赖，`vue` 作为 peerDependencies。
2. 新增 `vue3/tsconfig.json`，开启 `"jsx": "preserve"` 以兼容 vue-tsc。
3. 新增 `vue3/vite.config.ts`，引入 `@vitejs/plugin-vue` 用于 `.vue` 文件编译和库模式构建（core 用纯 tsc 可行，但 vue3 含 `.vue` 文件必须走 vite 或 vue-tsc）。
4. 新增 `vue3/vitest.config.ts`（或复用 vite.config），配置 `environment: 'happy-dom'`（或 `jsdom`）以及 `@vue/test-utils`，确保 Vue 组件测试可以运行。
5. 新增 `vue3/src/index.ts`，统一导出 composable、组件、类型。
6. 根据仓库实际情况决定是否补根级 workspace 配置；若当前阶段不需要发包，可暂缓。

完成标准：

1. `vue3` 包可以单独构建，产出 ESM 格式的 JS 与 `.d.ts` 类型文件。
2. `vitest run` 可以执行（即使此阶段测试文件尚为空）。
3. 对外导出面清晰稳定。

### 阶段二：composable 落地

目标：

1. 用 Vue 响应式系统封装 core 的处理器。
2. 支持 `parse`、`write`、`reset`、`cancel`、`consume`。

任务：

1. 实现 `useMarkdownStream()`。
2. 内部维护 `tokens`、`isStreaming`、`error`。
3. 每次 `parse` 或 `write` 后同步刷新 `tokens.value = processor.snapshot()`。`parse()` 与 `write()` 对外返回 `void`，不透传 core 的 diff 返回值，避免调用方误将 diff 当作完整快照使用。
4. 实现 `cancel()`：推进内部递增 `runId`，使当前进行中的 `consume()` 所有后续 chunk 写入失效。
5. `reset()` 内部先调用 `cancel()` 取消活跃流，再调用 `processor.reset()` 清空 core 状态，最后将 `tokens`、`isStreaming`、`error` 归零。
6. `consume()` 中处理异步流迭代，记录本次 runId，每个 chunk 写入前校验 runId 仍有效。`isStreaming` 在进入时设为 `true`，在 `finally` 块中置回 `false`，确保异常路径下也能正确关闭。
7. 处理 `onUnmounted` 注册问题：在 `setup()` 上下文中调用时，通过 `getCurrentInstance()` 检测，自动注册 `onUnmounted` 钩子调用 `cancel()`；在组件外调用时钩子不注册，由调用方手动调用 `cancel()`。

完成标准：

1. 一次性字符串和流式输入都能驱动响应式更新。
2. 组件卸载或输入源切换时不会出现过期写入。
3. `reset()` 能中断进行中的 stream，不留残态。
4. composable API 足够支撑组件层复用。

### 阶段三：默认渲染组件

目标：

1. 提供可直接使用的 `MarkdownStream` 组件。
2. 实现 token 递归渲染能力。

任务：

1. 实现 `MarkdownStream.vue`。
2. 实现 `MarkdownTokenNode.vue`。
3. 建立默认 token type 到渲染节点的映射。
4. 为 `token.state` 增加稳定的标记方式，例如 `data-state`。

完成标准：

1. 常见 Markdown 内容能完整显示。
2. token 子树递归稳定，不出现重复渲染或结构错乱。
3. streaming 状态可被样式层感知。

### 阶段四：自定义渲染扩展

目标：

1. 允许业务方替换某类 token 的默认显示方式。

任务：

1. 定义 `MarkdownTokenComponentMap` 类型。
2. 在根组件和递归组件中接入 `components` 映射。
3. 为自定义组件定义稳定的 props 契约。

完成标准：

1. 可以仅覆写单个 token 类型而不影响其他默认渲染。
2. 自定义组件仍能访问 token 原始信息与子树。

### 阶段五：测试与文档

目标：

1. 补齐核心行为验证。
2. 输出最小可用文档。

任务：

1. 测 composable 的 `parse`、`write`、`reset`、`consume`。
2. 测组件对标题、段落、列表、代码块、链接的渲染。
3. 测流式场景下 DOM 更新是否符合预期。
4. 测自定义 renderer 覆盖是否生效。
5. 编写 `vue3/README.md`。
6. 更新仓库根 README，补齐整体使用方式。

完成标准：

1. 关键路径具备自动化测试。
2. 文档能支持使用者从安装到接入跑通最小示例。

## 关键实现细节

### 1. 状态同步策略

Vue 层不要自己维护 diff 合并逻辑，统一以 core 的 `snapshot()` 作为当前完整状态来源。

建议规则：

1. `parse(markdown)` 后直接用返回值或 `snapshot()` 更新 `tokens`。
2. `write(chunk)` 后立即刷新 `tokens.value = processor.snapshot()`。
3. `consume(stream)` 内部每收到一个 chunk 就调用 `write()`。

### 2. 异步流保护

流式接入要处理以下风险：

1. 新旧 `stream` 切换时，旧流异步结果晚到。
2. 组件已经卸载，但流还在继续。
3. 多次并发调用 `consume()` 导致状态串写。

建议做法：

1. composable 内维护递增 `runId`（`let currentRunId = 0`）。
2. 每次调用 `cancel()` 或开始新的 `consume()` 时推进 `++currentRunId`，记录本次 `localId = currentRunId`。
3. 每个 chunk 写入前校验 `localId === currentRunId`，不一致则 break/return。
4. `cancel()` 作为独立方法对外暴露，`reset()` 内部先调用它。
5. 在 `setup()` 上下文中通过 `getCurrentInstance()` 检测，自动注册 `onUnmounted(() => cancel())`；在组件外使用时由调用方负责手动调用。

### 3. `source` 与 `stream` 的优先级

建议约定：

1. `source` 用于一次性渲染。
2. `stream` 用于流式消费。
3. 同时传入两者时，以 `stream` 为主，或直接在文档中声明不建议同时使用。

### 4. 默认样式策略

v1 不内置重样式主题，只保留最基础的结构与状态标记。

建议至少暴露：

1. 根节点 class。
2. 各 token 类型 class，例如 `ms-token-heading`。
3. 状态标记，例如 `data-state="streaming"`。

## 测试计划

### composable 测试

1. `parse()` 后 `tokens` 为完整快照（非 diff）。
2. 连续 `write()` 后 token id 稳定，最后一个 block 状态更新正确。
3. `reset()` 后 `tokens`、`isStreaming`、`error` 全部归零，进行中的 stream 不再写入。
4. `cancel()` 单独调用后，后续 chunk 写入不更新 `tokens`。
5. `consume()` 能按 chunk 顺序更新，`isStreaming` 在 stream 结束后回到 `false`。
6. stream 中途抛出异常时，`error` 正常暴露，`isStreaming` 回到 `false`（验证 finally 路径）。
7. 切换流时（`cancel()` + 新 `consume()`），旧流后续结果不覆盖新状态。
8. 在 `setup()` 外调用时不抛出，组件卸载不自动 cancel（由调用方负责）。

### 组件测试

1. 标题渲染为正确层级的 `h1 ~ h6`。
2. 段落、列表、引用、代码块结构正确。
3. 链接 `href` 和 `title` 正确传递。
4. `token.state` 会反映到 DOM 标记。
5. 自定义组件可覆写单个 token 类型。

## 文档计划

`vue3/README.md` 建议至少包含：

1. 安装方式。
2. 一次性渲染示例。
3. 流式输入示例。
4. `useMarkdownStream()` 示例。
5. 自定义 token 渲染示例。
6. 与 `@markdown-stream/core` 的职责边界说明。

## v1 不做的内容

为了控制复杂度，以下内容建议先不进入 v1：

1. SSR / Nuxt 专项适配。
2. 内置代码高亮集成。
3. 内置主题系统。
4. 拖拽编辑、双向编辑能力。
5. inline 级别更细的状态动画。

## 验收标准

v1 完成后应满足：

1. Vue 3 用户可以直接通过组件渲染 Markdown。
2. Vue 3 用户可以通过 composable 自己接管渲染。
3. 流式输入时能稳定反映 `start / streaming / done`。
4. 常见 Markdown 结构渲染正确。
5. 支持自定义 token 组件覆盖。
6. 具备基础测试和可运行文档。

## 建议里程碑

1. M1：完成 `vue3` 包脚手架与 `useMarkdownStream()`。
2. M2：完成默认 token 渲染组件。
3. M3：完成自定义渲染扩展、测试与 README。
