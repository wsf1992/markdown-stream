# 自定义 Token 体系

## 概念

`@markdown-stream` 的自定义 Token 机制允许你拦截特定的 Markdown 块（fenced code block、inline 文本等），用自己的 Vue 组件来渲染，而不是使用默认的 HTML 输出。

每个自定义 Token 有三种状态（`StatefulToken.state`）：

| state | 含义 | 触发时机 |
|---|---|---|
| `start` | Token 开始，内容尚未到达 | 检测到开始标记后（如 ` ```json` 行出现时） |
| `streaming` | 内容流式到达中 | 每收到新的 chunk，内容更新时 |
| `done` | Token 完整，已闭合 | 检测到结束标记后（如 ` ``` ` 出现时） |

每种状态可以对应不同的渲染组件，实现骨架屏 → 加载动画 → 最终样式的平滑过渡。

---

## CustomTokenDefinition 接口

```ts
interface CustomTokenDefinition {
  /** token 类型名，作为唯一标识符 */
  name: string

  /** 所有 state 的兜底组件（markRaw 包裹） */
  component?: Component

  /** state === 'start' 时渲染的组件 */
  start?: Component

  /** state === 'streaming' 时渲染的组件 */
  streaming?: Component

  /** state === 'done' 时渲染的组件 */
  done?: Component

  /**
   * 匹配 fence 的 info 字符串（如 ```json 中的 "json"）
   * 若同时提供 closeRegex，则匹配自定义 open/close token 对
   */
  openRegex?: string | RegExp

  /** 匹配自定义 close token（与 openRegex 配合使用） */
  closeRegex?: string | RegExp

  /**
   * 匹配 inline token 内容的正则
   * 例如 /^pink(.+)pink$/ 匹配 "pink文本pink"，token.content 为捕获组内容
   */
  contentRegex?: string | RegExp
}
```

### 渲染优先级

```
state 专属组件（start / streaming / done）
  > component（兜底，未定义专属时使用）
    > 不渲染（既无专属也无兜底）
```

---

## Playground 注册的全部 Token

源码：[playground/src/tokens/index.ts](../src/tokens/index.ts)

```ts
import { markRaw } from 'vue'
import { MarkdownStream } from '@markdown-stream/vue3'
import { VueSfcFenceRenderer, SfcRendererPending } from '@markdown-stream/vue3'

export const tokenComponents = [
  // 代码块：三态渲染
  {
    name: 'fence',
    start:     markRaw(CodeSkeleton),   // 骨架屏
    streaming: markRaw(CodeStreaming),  // 输入中
    done:      markRaw(CodeBlock),      // 完成
  },

  // Vue SFC：fence info="ui"
  {
    name: 'vue_sfc',
    openRegex: /^ui$/,
    start:     markRaw(SfcRendererPending),
    streaming: markRaw(SfcRendererPending),
    done:      markRaw(VueSfcFenceRenderer),  // 真正执行 SFC 渲染
  },

  // Vue 预览：fence info="preview"
  {
    name: 'vue_preview',
    openRegex: /^preview$/,
    component: markRaw(PreviewRenderer),  // 三态统一
  },

  // JSON 块：fence info="json"
  {
    name: 'json',
    openRegex: /^json$/,
    component: markRaw(JsonBlock),
  },

  // Callout 提示块
  { name: 'callout-info',    openRegex: /^callout-info$/,    component: markRaw(CalloutBlock) },
  { name: 'callout-warning', openRegex: /^callout-warning$/, component: markRaw(CalloutBlock) },
  { name: 'callout-danger',  openRegex: /^callout-danger$/,  component: markRaw(CalloutBlock) },

  // Inline 粉色高亮
  {
    name: 'pink_highlight',
    contentRegex: /^pink(.+)pink$/,
    component: markRaw(PinkHighlight),
  },

  // 图片 Token
  {
    name: 'image',
    openRegex: /^image$/,
    component: markRaw(ImageToken),
  },
]
```

---

## 封装 MarkdownWithTokens

```ts
export const MarkdownWithTokens = defineComponent({
  name: 'MarkdownWithTokens',
  props: {
    content: { type: [String, Object] as PropType<string | AsyncIterable<string>>, default: undefined },
    debug:   { type: Boolean, default: false },
  },
  setup(props) {
    return () =>
      h(MarkdownStream, {
        content:    props.content,
        components: tokenComponents,
        debug:      props.debug,
      })
  },
})
```

通过封装，所有 Demo 只需 `import { MarkdownWithTokens } from '../tokens'` 就能获得预装所有自定义 Token 的渲染器，无需在每处重复传 `components`。

---

## 组件接收的 Props

所有自定义 Token 组件接收相同的 props：

```ts
interface TokenComponentProps {
  token: StatefulToken
}
```

`StatefulToken` 的关键字段：

```ts
interface StatefulToken {
  id: string | number        // token 唯一 id
  type: string               // token 类型名（如 'fence'、'pink_highlight'）
  state: 'start' | 'streaming' | 'done'
  content?: string           // token 内容（流式追加）
  meta?: Record<string, unknown>  // 额外元数据，如 fence 的 info 字段
  children?: StatefulToken[] // 子 token（用于 block 内嵌套 inline）
}
```

---

## 最小化自定义 Token 示例

以下是创建一个高亮块 token 的完整步骤：

### 1. 编写渲染组件

```vue
<!-- HighlightBlock.vue -->
<script setup lang="ts">
import type { StatefulToken } from '@markdown-stream/core'
defineProps<{ token: StatefulToken }>()
</script>

<template>
  <div class="highlight" :data-state="token.state">
    <pre>{{ token.content }}</pre>
  </div>
</template>
```

### 2. 注册 Token

```ts
import { markRaw } from 'vue'
import { MarkdownStream } from '@markdown-stream/vue3'
import HighlightBlock from './HighlightBlock.vue'

const components = [
  {
    name: 'highlight',
    openRegex: /^highlight$/,   // 匹配 ```highlight
    component: markRaw(HighlightBlock),
  }
]
```

### 3. 使用

```vue
<MarkdownStream :content="md" :components="components" />
```

```markdown
` `` `highlight
这段文字会被高亮显示
` `` `
```
