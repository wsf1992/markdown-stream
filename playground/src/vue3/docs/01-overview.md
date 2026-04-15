# Playground 总览

本 playground 是 `@markdown-stream` 系列包的功能演示项目，展示了如何在 Vue 3 中进行 Markdown 的一次性渲染、流式渲染以及与大模型对话时的实时流式展示。

## 目录结构

```
playground/
├── src/
│   ├── App.vue                  # 根组件，切换三个 Demo Tab
│   ├── main.ts                  # 应用入口
│   ├── style.css                # 全局样式
│   ├── tokens.md                # 所有 Token 的演示 Markdown 内容
│   ├── tokens/
│   │   └── index.ts             # 注册所有自定义 Token，导出 MarkdownWithTokens 封装组件
│   ├── services/
│   │   └── api.ts               # 对接大模型 API（MiniMax），处理 SSE 流
│   └── components/
│       ├── DemoOnce.vue         # 示例1：一次性渲染
│       ├── DemoStream.vue       # 示例2：流式渲染
│       ├── DemoSfc.vue          # 示例3：与大模型对话（流式 + SFC 预览）
│       ├── CodeBlock.vue        # fence token：渲染完成态（macOS 风格代码块）
│       ├── CodeSkeleton.vue     # fence token：起始态（骨架屏）
│       ├── CodeStreaming.vue    # fence token：流式输入中状态
│       ├── CalloutBlock.vue     # callout-info / callout-warning / callout-danger token
│       ├── JsonBlock.vue        # json token（带格式化、复制、图片预览）
│       ├── PinkHighlight.vue    # inline pink 高亮 token
│       ├── ImageToken.vue       # image token（JSON 数据解析后展示图片）
│       ├── PreviewRenderer.vue  # preview token（Vue 预览块）
│       └── CounterCard.vue     # 示例用 Vue 组件（计数器）
```

## 三个 Demo Tab

| Tab 名称 | 对应组件 | 核心功能 |
|---|---|---|
| 一次性渲染 | `DemoOnce.vue` | 将完整 Markdown 字符串一次性渲染，支持 debug 模式 |
| 流式渲染 | `DemoStream.vue` | 模拟逐行 chunk 推送，展示 Token 三态渲染效果 |
| 与大模型对话 | `DemoSfc.vue` | 接入 MiniMax API，对话结果实时流式渲染 Markdown |

## 依赖的核心包

- `@markdown-stream/core` — 流式 Markdown 解析内核，提供 `StatefulToken`、`TokenTypeDefinition` 等类型
- `@markdown-stream/vue3` — Vue 3 渲染层，提供 `MarkdownStream` 组件、`VueSfcFenceRenderer`、`MarkdownTokenNode`

## 关键封装：MarkdownWithTokens

所有三个 Demo 都使用 `MarkdownWithTokens`（定义在 `src/tokens/index.ts`），这是对 `MarkdownStream` 的预配置包装，预先注册了以下全部自定义 Token：

```
fence          → 三态：CodeSkeleton → CodeStreaming → CodeBlock
vue_sfc        → fence info=ui，三态都用 SfcRendererPending，done 用 VueSfcFenceRenderer
vue_preview    → fence info=preview，三态都用 PreviewRenderer
json           → fence info=json，三态都用 JsonBlock
callout-info   → fence info=callout-info，使用 CalloutBlock
callout-warning→ fence info=callout-warning，使用 CalloutBlock
callout-danger → fence info=callout-danger，使用 CalloutBlock
pink_highlight → inline contentRegex=/^pink(.+)pink$/，使用 PinkHighlight
image          → fence info=image，使用 ImageToken
```
