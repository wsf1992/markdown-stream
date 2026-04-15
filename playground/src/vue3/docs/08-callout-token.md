# Callout 提示块 Token

## 功能说明

Callout 是一种带有语义图标和颜色的提示块，常见于文档工具（Notion、GitBook 等）。playground 实现了三种类型：

| Token 类型 | fence info | 语义 | 图标 |
|---|---|---|---|
| `callout-info` | `callout-info` | 普通提示 | ℹ️ 提示 |
| `callout-warning` | `callout-warning` | 警告 | ⚠️ 注意 |
| `callout-danger` | `callout-danger` | 危险 | 🚨 危险 |

三种类型共用同一个 `CalloutBlock` 组件，通过 `token.meta?.kind` 字段区分样式。

## 源码位置

[playground/src/components/CalloutBlock.vue](../src/components/CalloutBlock.vue)

## 完整代码

```vue
<script setup lang="ts">
import { MarkdownTokenNode } from '@markdown-stream/vue3'
import type { StatefulToken } from '@markdown-stream/core'

const props = defineProps<{ token: StatefulToken }>()

const labels: Record<string, string> = {
  info:    'ℹ️ 提示',
  warning: '⚠️ 注意',
  danger:  '🚨 危险',
}
</script>

<template>
  <div
    :class="`callout callout-${token.meta?.kind ?? 'info'}`"
    :data-state="token.state"
  >
    <div class="label">
      {{ labels[token.meta?.kind as string] ?? '提示' }}
    </div>
    <MarkdownTokenNode
      v-for="child in token.children"
      :key="child.id"
      :token="child"
    />
  </div>
</template>
```

## 注册配置

```ts
{ name: 'callout-info',    openRegex: /^callout-info$/,    component: markRaw(CalloutBlock) },
{ name: 'callout-warning', openRegex: /^callout-warning$/, component: markRaw(CalloutBlock) },
{ name: 'callout-danger',  openRegex: /^callout-danger$/,  component: markRaw(CalloutBlock) },
```

三个独立的 token 定义，使用不同的 `openRegex` 匹配不同的 fence info，共用同一个组件。

## 关键：MarkdownTokenNode

```vue
<MarkdownTokenNode
  v-for="child in token.children"
  :key="child.id"
  :token="child"
/>
```

这是 Callout 的核心：**内部内容也是 Markdown，需要递归渲染**。

`MarkdownTokenNode` 是 `@markdown-stream/vue3` 提供的递归渲染组件，它能正确处理 `token.children`（子 token 数组），使 Callout 内部的文字可以包含：

- **粗体**（`**text**`）
- `inline code`
- pink 高亮（`pink文本pink`，如果已注册该 token）
- 其他 inline token

### 示例

````markdown
```callout-warning
请注意这个警告内容，**pink这是警告中的粉色高亮pink**。
```
````

渲染结果中，Callout 内部的 `**...**` 会正确渲染为粗体，`pink...pink` 会渲染为粉色高亮——这些都是通过 `MarkdownTokenNode` 递归渲染 `token.children` 实现的。

## token.meta?.kind 的值

框架在解析时，会将 `openRegex` 匹配到的 fence info 字符串存入 `token.meta`。对于 `callout-warning`，`token.meta` 类似：

```ts
token.meta = {
  kind: 'warning',    // 从 fence info "callout-warning" 中提取
  info: 'callout-warning',  // 原始 fence info 字符串
}
```

因此 `token.meta?.kind` 可以直接用于 CSS 类名和 label 查找。

## Markdown 用法

````markdown
```callout-info
这是一条提示信息，用于展示重要提示内容。
```

```callout-warning
请注意这个警告内容，**pink这是警告中的粉色高亮pink**。
```

```callout-danger
危险操作，请确认！这是一个 **pink危险警告pink** 示例。
```
````

## 样式建议

```css
.callout {
  border-radius: 8px;
  padding: 12px 16px;
  margin: 12px 0;
  border-left: 4px solid;
}

.callout-info {
  background: #eff6ff;
  border-color: #3b82f6;
  color: #1e40af;
}

.callout-warning {
  background: #fffbeb;
  border-color: #f59e0b;
  color: #92400e;
}

.callout-danger {
  background: #fef2f2;
  border-color: #ef4444;
  color: #991b1b;
}

.callout .label {
  font-weight: 600;
  margin-bottom: 4px;
}
```

## data-state 属性

```vue
<div :data-state="token.state">
```

组件在根元素上暴露 `data-state`，可以用 CSS 对不同状态做差异化处理：

```css
/* 流式输入时降低透明度 */
.callout[data-state="streaming"] {
  opacity: 0.7;
  transition: opacity 0.3s;
}

/* 完成后恢复 */
.callout[data-state="done"] {
  opacity: 1;
}
```
