# @markdown-stream/vue3

[@markdown-stream/core](../core) 的 Vue 3 组件层。

## 安装

```bash
npm install @markdown-stream/vue3 @markdown-stream/core vue
```

---

## 一次性渲染

传入 `source` 字符串，直接渲染完整 Markdown。

```vue
<script setup lang="ts">
import { MarkdownStream } from '@markdown-stream/vue3'
</script>

<template>
  <MarkdownStream source="# Hello\n\nThis is **markdown**." />
</template>
```

---

## 流式输入

传入 `stream`（`AsyncIterable<string>`），随 chunk 到达实时更新视图。

```vue
<script setup lang="ts">
import { MarkdownStream } from '@markdown-stream/vue3'

async function* aiStream() {
  yield '# Title\n\n'
  yield 'Streaming content...'
}
</script>

<template>
  <MarkdownStream :stream="aiStream()" />
</template>
```

---

## 自定义 Token 与组件

通过 `components` 数组同时定义「如何解析」和「如何渲染」，组件直接传入，无需 `markRaw()`。

```ts
interface CustomTokenDefinition {
  name: string              // token 类型名
  component?: Component     // 所有 state 的兜底渲染组件
  start?: Component         // 仅 state === 'start' 时渲染
  streaming?: Component     // 仅 state === 'streaming' 时渲染
  done?: Component          // 仅 state === 'done' 时渲染
  openRegex?: string | RegExp   // 有此字段时自动注册解析规则
  closeRegex?: string | RegExp  // 配合 openRegex 匹配 open/close token 对
}
```

**State 渲染规则：** 专属组件（`start / streaming / done`）优先于 `component` 兜底；某 state 未定义且无兜底时，该 state 下不渲染任何内容。

### 覆盖已有 token 的渲染

只传 `name + component`，不改变解析逻辑：

```vue
<template>
  <MarkdownStream
    :source="markdown"
    :components="[
      { name: 'fence',   component: MyCodeBlock },
      { name: 'heading', component: MyHeading   },
    ]"
  />
</template>
```

### Fence 模式：匹配代码围栏的语言标识符

添加 `openRegex`，匹配 ` ``` ` 后的 info 字段：

````md
```warning
这是一段警告内容。
```
````

```vue
<template>
  <MarkdownStream
    :source="markdown"
    :components="[
      { name: 'warning', openRegex: /^warning$/, component: WarningBlock },
    ]"
  />
</template>
```

`WarningBlock.vue` 通过 `token.content` 获取围栏内文本：

```vue
<script setup lang="ts">
import type { StatefulToken } from '@markdown-stream/core'
defineProps<{ token: StatefulToken }>()
</script>

<template>
  <aside class="warning" :data-state="token.state">{{ token.content }}</aside>
</template>
```

### 按 state 分别渲染不同组件

流式场景下为不同阶段提供独立组件：

```vue
<template>
  <MarkdownStream
    :stream="aiStream()"
    :components="[
      {
        name:      'fence',
        start:     CodeSkeleton,   // 骨架屏
        streaming: CodeStreaming,  // 打字动效
        done:      CodeBlock,      // 最终高亮版本
      },
    ]"
  />
</template>
```

---

## 内置组件

### SfcRendererPending

Vue SFC 生成过程中的骨架屏占位组件，用于 `fence` token 的 `start` / `streaming` 阶段。

显示一张带波浪动画的卡片，包含头像、标题行、副标题行及横幅区块，视觉上模拟「内容即将出现」的加载状态。

```vue
<script setup lang="ts">
import { MarkdownStream, SfcRendererPending } from '@markdown-stream/vue3'
</script>

<template>
  <MarkdownStream
    :stream="aiStream()"
    :components="[
      {
        name:      'fence',
        start:     SfcRendererPending,  // 骨架屏：尚未收到内容
        streaming: SfcRendererPending,  // 骨架屏：内容流入中
      },
    ]"
  />
</template>
```

---

### VueSfcFenceRenderer

用于渲染 ` ```vue ` 代码围栏的内置组件，适合 AI 流式生成 Vue SFC 后的「完成态」展示。

**功能：**

- 非 `vue` 语言的围栏退化为普通 `<pre><code>` 块。
- `vue` 围栏提供 **Preview / Code** 双标签页：
  - **Preview**：将 SFC 源码注入 Blob URL iframe，通过 `vue3-sfc-loader` 在沙箱中即时编译并运行，iframe 高度随内容自适应。
  - **Code**：以等宽字体展示原始源码。
- 右上角 **Copy** 按钮，点击后 2 秒内显示复制成功状态。

```vue
<script setup lang="ts">
import { MarkdownStream, SfcRendererPending, VueSfcFenceRenderer } from '@markdown-stream/vue3'
</script>

<template>
  <MarkdownStream
    :stream="aiStream()"
    :components="[
      {
        name:      'fence',
        start:     SfcRendererPending,    // 骨架屏
        streaming: SfcRendererPending,    // 骨架屏
        done:      VueSfcFenceRenderer,   // 预览 + 代码双标签
      },
    ]"
  />
</template>
```

> **沙箱依赖**：iframe 内通过 CDN 加载 `vue@3`、`vue3-sfc-loader` 及 `tailwindcss`，需要网络访问权限。sandbox 属性设置为 `allow-scripts allow-same-origin allow-modals allow-popups allow-forms`。
