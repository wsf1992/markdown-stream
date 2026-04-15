# @markdown-stream/vue3

[@markdown-stream/core](../core) 的 Vue 3 组件层。

## 安装

```bash
npm install @markdown-stream/vue3
```

---

## Props 参考

| Prop | 类型 | 说明 |
|------|------|------|
| `content` | `string \| AsyncIterable<string>` | 统一入口：字符串一次性渲染，`AsyncIterable` 流式渲染（推荐） |
| `components` | `CustomTokenDefinition[] \| Partial<MarkdownTokenComponentMap>` | 自定义 token 定义或渲染组件映射 |
| `cursor` | `boolean` | 流式输出时显示打字光标，默认 `false` |
| `debug` | `boolean` | 在 console 打印 token 状态变化，默认 `false` |

---

## 快速上手：统一 `content` prop

无需区分数据来源，直接传 `content`——字符串一次性渲染，`AsyncIterable` 流式渲染：

```vue
<script setup lang="ts">
import { MarkdownStream } from '@markdown-stream/vue3'

// 一次性字符串
const markdownString = '# Hello\n\nThis is **markdown**.'

// 或流式 AsyncIterable（来自 AI / SSE 等）
async function* aiStream() {
  yield '# Title\n\n'
  yield 'Streaming content...'
}
</script>

<template>
  <!-- 传字符串 -->
  <MarkdownStream :content="markdownString" />

  <!-- 传 AsyncIterable -->
  <MarkdownStream :content="aiStream()" />
</template>
```

---


## 自定义 Token 与组件

通过 `components` 数组同时定义「如何解析」和「如何渲染」，组件直接传入

```ts
interface CustomTokenDefinition {
  name: string              // token 类型名
  component?: Component     // 渲染组件，token.state 在组件内部自行处理
  openRegex?: string | RegExp   // 有此字段时自动注册解析规则
  closeRegex?: string | RegExp  // 配合 openRegex 匹配 open/close token 对
  contentRegex?: RegExp         // 匹配行内文本片段，捕获组内容作为 token.content 传入组件
}
```

### 覆盖已有 token 的渲染

只传 `name + component`，不改变解析逻辑：

```vue
<template>
  <MarkdownStream
    :content="markdown"
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
    :content="markdown"
    :components="[
      { name: 'warning', openRegex: /^warning$/, component: WarningBlock },
    ]"
  />
</template>
```

`WarningBlock.vue` 通过 `token.content` 获取围栏内文本：

```vue
<script setup lang="ts">
import type { StatefulToken } from '@markdown-stream/vue3'
defineProps<{ token: StatefulToken }>()
</script>

<template>
  <aside class="warning" :data-state="token.state">{{ token.content }}</aside>
</template>
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

```vue
<script setup lang="ts">
import { computed } from 'vue'
import type { StatefulToken } from '@markdown-stream/vue3'

const props = defineProps<{ token: StatefulToken }>()

const parsedJson = computed(() => {
  try {
    return JSON.parse(props.token.content || '')
  } catch { return null }
})

const imgUrl = computed(() => {
  if (!parsedJson.value) return null
  const url = parsedJson.value.img || parsedJson.value.image || null
  // 处理 // 开头的相对协议 URL
  return url?.startsWith('//') ? 'https:' + url : url
})
</script>

<template>
  <div class="json-block">
    <!-- 图片预览 -->
    <div v-if="imgUrl" class="json-image">
      <img :src="imgUrl" :alt="parsedJson?.name" />
    </div>
    <!-- JSON 内容 -->
    <pre v-if="parsedJson"><code>{{ JSON.stringify(parsedJson, null, 2) }}</code></pre>
    <!-- 加载中 -->
    <div v-else class="json-loading">解析中...</div>
  </div>
</template>
```

使用方式：

```vue
<template>
  <MarkdownStream
    :content="markdown"
    :components="[
      { name: 'json', openRegex: /^json$/, component: JsonBlock },
    ]"
  />
</template>
```

---

## 内联 Token 拦截

除了代码块等块级 token，你还可以拦截行内（inline）语法，替换默认渲染或定义全新的行内样式。

### 覆盖已有内联 Token

直接用 `name` 指向已有内联 token（如 `strong`、`em`、`code_inline`），传入自定义 `component`，不改变任何解析逻辑：

| 内置名称 | 对应 Markdown 语法 |
|---|---|
| `strong` | `**加粗**` 或 `__加粗__` |
| `em` | `*斜体*` 或 `_斜体_` |
| `code_inline` | `` `行内代码` `` |

```vue
<template>
  <MarkdownStream
    :content="markdown"
    :components="[
      { name: 'strong', component: MyHighlight },
    ]"
  />
</template>
```

自定义组件通过 `token.children[0].content` 取得被包裹的文本：

```vue
<!-- MyHighlight.vue -->
<script setup lang="ts">
import type { StatefulToken } from '@markdown-stream/vue3'
defineProps<{ token: StatefulToken }>()
</script>

<template>
  <span style="background:#fef08a; padding:2px 4px; border-radius:3px; color:#854d0e;">
    {{ token.children?.[0]?.content }}
  </span>
</template>
```

效果：`**重要文字**` 将渲染为黄色高亮而不是加粗。

---

### contentRegex：自定义行内语法

使用 `contentRegex` 可以匹配任意行内文本片段，无需改动 Markdown 解析器。组件通过 `token.content` 获取正则捕获后的内容。

**示例：将 `pink文字pink` 渲染为粉色高亮**

Markdown 原文：

```md
这段话里有一个 pink重要提示pink 需要特别关注。
```

注册配置：

```vue
<template>
  <MarkdownStream
    :content="markdown"
    :components="[
      {
        name: 'pink_highlight',
        contentRegex: /^pink(.+)pink$/,
        component: PinkHighlight,
      },
    ]"
  />
</template>
```

`PinkHighlight.vue` 直接读取 `token.content`（已提取捕获组内容）：

```vue
<!-- PinkHighlight.vue -->
<script setup lang="ts">
import type { StatefulToken } from '@markdown-stream/vue3'
defineProps<{ token: StatefulToken }>()
</script>

<template>
  <span style="background:#fce7f3; padding:2px 4px; border-radius:3px; color:#be185d; font-weight:500;">
    {{ token.content }}
  </span>
</template>
```

---

### 同时使用多种内联拦截

```vue
<template>
  <MarkdownStream
    :content="markdown"
    :components="[
      { name: 'strong',        component: YellowHighlight },
      { name: 'em',            component: BlueItalic      },
      { name: 'code_inline',   component: StyledCode      },
      { name: 'pink_highlight', contentRegex: /^pink(.+)pink$/, component: PinkHighlight },
    ]"
  />
</template>
```

> **注意**：`contentRegex` 匹配 inline 内容时，会将所有文本节点拼接后整体匹配。正则捕获组（第一个括号）的内容会作为 `token.content` 传给组件。即使内容中包含 URL（被 linkify 自动转换为链接），匹配仍然正常工作。

---

## 内置组件

### SfcRendererPending

Vue SFC 生成过程中的骨架屏占位组件，用于 `fence` token 的 `streaming` 阶段。

显示一张带波浪动画的卡片，包含头像、标题行、副标题行及横幅区块，视觉上模拟「内容即将出现」的加载状态。可在自定义组件内部根据 `token.state` 决定是否展示。

```vue
<script setup lang="ts">
import type { StatefulToken } from '@markdown-stream/vue3'
import { SfcRendererPending } from '@markdown-stream/vue3'

defineProps<{ token: StatefulToken }>()
</script>

<template>
  <!-- streaming 阶段显示骨架屏，done 阶段渲染实际内容 -->
  <SfcRendererPending v-if="token.state === 'streaming'" />
  <div v-else>{{ token.content }}</div>
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
import { MarkdownStream, VueSfcFenceRenderer } from '@markdown-stream/vue3'
</script>

<template>
  <MarkdownStream
    :content="aiStream()"
    :components="[
      { name: 'fence', component: VueSfcFenceRenderer },
    ]"
  />
</template>
```

> **沙箱说明**：`vue@3`、`vue3-sfc-loader` 及 `@tailwindcss/browser` 已内联打包至组件内，无需任何外部网络请求。sandbox 属性设置为 `allow-scripts allow-same-origin allow-modals allow-popups allow-forms`。

---

## 流式计时字段

所有顶层 block token 的 `meta` 中会自动注入以下两个计时字段，由内部 diff 阶段写入，无需手动设置：

| 字段 | 类型 | 写入时机 |
|------|------|----------|
| `streamStartTime` | `number`（毫秒时间戳） | token **首次出现**时记录，后续更新中保持不变 |
| `streamDoneTime` | `number`（毫秒时间戳） | token **状态变为 `done`** 时记录，streaming 阶段不存在此字段 |

典型用法——在自定义组件中计算 token 从出现到完成的耗时：

```vue
<script setup>
import { computed } from 'vue'

const props = defineProps(['token'])

const elapsed = computed(() => {
  const start = props.token.meta?.streamStartTime
  const done = props.token.meta?.streamDoneTime ?? Date.now()
  return done - start // 毫秒
})
</script>

<template>
  <div>
    <slot />
    <span v-if="token.state === 'done'">生成耗时 {{ elapsed }} ms</span>
  </div>
</template>
```

> 这两个字段不参与内容相等性比较，不会因时间戳变化触发多余的重渲染。

