# 代码块三态渲染（fence token）

## 功能说明

`fence` 是最典型的三态 token 示例。在流式场景下，一个代码块从开始到完成经历三个阶段，对应三个不同的 Vue 组件：

| 阶段 | state | 组件 | 视觉效果 |
|---|---|---|---|
| 开始符到达（` ```ts` 行） | `start` | `CodeSkeleton` | 灰色占位骨架屏 |
| 代码内容逐行到达 | `streaming` | `CodeStreaming` | 显示已有代码 + 右上角"输入中…"标记 |
| 闭合符到达（` ``` ` 行） | `done` | `CodeBlock` | macOS 风格深色代码框，完整代码 |

## 注册配置

```ts
{
  name: 'fence',
  start:     markRaw(CodeSkeleton),
  streaming: markRaw(CodeStreaming),
  done:      markRaw(CodeBlock),
}
```

注意：`fence` 是内置 token 类型，无需指定 `openRegex`，直接覆盖其渲染组件即可。

---

## CodeSkeleton（骨架屏）

源码：[playground/src/components/CodeSkeleton.vue](../src/components/CodeSkeleton.vue)

```vue
<script setup lang="ts">
import type { StatefulToken } from '@markdown-stream/core'
defineProps<{ token: StatefulToken }>()
</script>

<template>
  <div class="skeleton" />
</template>
```

极简实现：只渲染一个占位 `div`，CSS 加上灰色背景和动画脉冲效果即可模拟骨架屏。在流式开始时立即占住空间，避免布局抖动。

---

## CodeStreaming（输入中）

源码：[playground/src/components/CodeStreaming.vue](../src/components/CodeStreaming.vue)

```vue
<script setup lang="ts">
import type { StatefulToken } from '@markdown-stream/core'
defineProps<{ token: StatefulToken }>()
</script>

<template>
  <pre class="ms-root" style="position:relative">
    <code>{{ token.content }}</code>
    <span style="position:absolute;right:10px;top:8px;font-size:11px;opacity:0.5">
      输入中…
    </span>
  </pre>
</template>
```

- `token.content` 在每次 chunk 到来时自动更新（响应式），Vue 会自动重渲染
- 右上角的"输入中…"标识让用户知道内容尚未完整

---

## CodeBlock（完成态）

源码：[playground/src/components/CodeBlock.vue](../src/components/CodeBlock.vue)

```vue
<script setup lang="ts">
import type { StatefulToken } from '@markdown-stream/core'
defineProps<{ token: StatefulToken }>()
</script>

<template>
  <div class="code-block">
    <div class="code-header">
      <div class="mac-dots">
        <span class="dot red"></span>
        <span class="dot yellow"></span>
        <span class="dot green"></span>
      </div>
      <span class="code-lang">{{ (token.meta?.info as string) || 'code' }}</span>
    </div>
    <pre class="code-content"><code>{{ token.content }}</code></pre>
  </div>
</template>
```

### 获取语言标识

```ts
token.meta?.info as string  // 例如 "ts"、"vue"、"python"
```

`info` 来自 Markdown 的 fence 行，如：
````
```typescript
// → token.meta.info === 'typescript'
````

### 样式特点

```css
.code-block {
  background: #1e1e1e;      /* VS Code 深色背景 */
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.code-header {
  background: #2d2d2d;      /* 标题栏稍亮 */
  border-bottom: 1px solid #3d3d3d;
}

/* macOS 三色圆点 */
.dot.red    { background: #ff5f56; }
.dot.yellow { background: #ffbd2e; }
.dot.green  { background: #27c93f; }

.code-content code {
  font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
  font-size: 13px;
  color: #d4d4d4;
}
```

---

## Markdown 用法

````markdown
```ts
function greet(name: string) {
  return `Hello, ${name}!`
}
```
````

任何语言标识（ts、vue、python、js、bash 等）都会触发 `fence` token，不需要特殊的 `openRegex`。

---

## 与语法高亮集成

当前示例没有集成语法高亮库（如 highlight.js、shiki），仅展示纯文本代码。若需要高亮，可在 `CodeBlock.vue` 的 `done` 状态下调用高亮库：

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { codeToHtml } from 'shiki'
import type { StatefulToken } from '@markdown-stream/core'

const props = defineProps<{ token: StatefulToken }>()

const highlighted = computed(async () => {
  const lang = (props.token.meta?.info as string) || 'text'
  return await codeToHtml(props.token.content ?? '', { lang, theme: 'github-dark' })
})
</script>

<template>
  <div v-html="highlighted" class="code-block" />
</template>
```
