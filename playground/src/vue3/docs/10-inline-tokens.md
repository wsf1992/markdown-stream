# Inline Token（粉色高亮 & 图片 Token）

## 粉色高亮（PinkHighlight）

### 功能说明

粉色高亮是一种 **inline token**，使用 `contentRegex` 匹配模式，可以直接嵌入段落文字中，无需独立的代码块。语法为 `pink内容pink`，渲染后显示粉色背景、玫红色文字的高亮 span。

### 源码位置

[playground/src/components/PinkHighlight.vue](../src/components/PinkHighlight.vue)

### 完整代码

```vue
<script setup lang="ts">
import type { StatefulToken } from '@markdown-stream/core'

const props = defineProps<{ token: StatefulToken }>()

// contentRegex 模式下，token.content 是捕获组提取后的内容
const text = props.token.content ?? ''
</script>

<template>
  <span
    :style="{
      backgroundColor: '#fce7f3',  /* 粉色背景（Tailwind pink-100） */
      padding: '2px 4px',
      borderRadius: '3px',
      color: '#be185d',            /* 玫红色文字（Tailwind pink-700） */
      fontWeight: '500',
    }"
  >
    {{ text }}
  </span>
</template>
```

### 注册配置

```ts
{
  name: 'pink_highlight',
  contentRegex: /^pink(.+)pink$/,  // 捕获组中的内容作为 token.content
  component: markRaw(PinkHighlight),
}
```

### contentRegex 工作原理

当框架在 inline 内容中遇到匹配 `contentRegex` 的文本时：

1. 将整段文本（如 `"pink警告内容pink"`）与正则匹配
2. 如果有捕获组（括号），将**第一个捕获组**的内容赋值给 `token.content`
3. 将该 inline 文本节点替换为自定义 token 渲染

所以 `token.content` 是 `"警告内容"`（不含前后的 `pink`），组件直接用 `{{ text }}` 渲染即可。

### Markdown 用法

```markdown
这是一段文字，pink这里是粉色高亮pink，后面继续普通文字。

> 引用中也可以有 **pink重点内容pink**。

```callout-warning
警告：**pink危险操作pink** 请谨慎！
```
```

### 嵌套使用

`pink...pink` 可以在任何 inline 上下文中使用，包括：

- 普通段落
- 引用块（`>`）
- 粗体/斜体内部（`**pink文本pink**`）
- Callout 提示块内部

这得益于 `MarkdownTokenNode` 的递归渲染机制。

---

## 图片 Token（ImageToken）

### 功能说明

图片 token 将 ` ```image` 代码块（内容为 JSON 格式）渲染为带图片名称说明的图片组件。相比普通 `![alt](url)` 语法，支持更多元数据（如名称、描述）且视觉上更独立。

### 源码位置

[playground/src/components/ImageToken.vue](../src/components/ImageToken.vue)

### 完整代码

```vue
<script setup lang="ts">
import { computed } from 'vue'
import type { StatefulToken } from '@markdown-stream/core'

const props = defineProps<{ token: StatefulToken }>()

interface ImageData {
  url: string
  name?: string
}

const imageData = computed<ImageData>(() => {
  try {
    return JSON.parse(props.token.content || '{}')
  } catch {
    return { url: '', name: '' }  // 流式中内容不完整时解析失败，返回空
  }
})
</script>

<template>
  <div class="image-token">
    <img
      v-if="imageData.url"
      :src="imageData.url"
      :alt="imageData.name || 'image'"
    />
    <div v-else class="loading-placeholder">Loading...</div>
    <span v-if="imageData.name" class="image-name">{{ imageData.name }}</span>
  </div>
</template>
```

### 注册配置

```ts
{
  name: 'image',
  openRegex: /^image$/,           // 匹配 ```image
  component: markRaw(ImageToken), // 三态统一
}
```

### 数据格式

````markdown
```image
{"url": "https://example.com/photo.jpg", "name": "示例图片"}
```
````

JSON 字段说明：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `url` | string | 是 | 图片 URL |
| `name` | string | 否 | 图片名称（显示在图片下方） |

### 样式

```css
.image-token {
  margin: 12px 0;
  text-align: center;
}

.image-token img {
  max-width: 100%;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* 图片未加载时的占位块 */
.loading-placeholder {
  display: inline-block;
  width: 120px;
  height: 120px;
  background: #f0f0f0;
  border-radius: 8px;
  line-height: 120px;
  color: #999;
}

.image-name {
  display: block;
  margin-top: 8px;
  font-size: 14px;
  color: #666;
}
```

### 流式行为

由于 JSON 内容在流式输入中是逐字到达的，解析会在中间状态失败（`try/catch` 捕获），此时 `imageData.url` 为空，显示 `Loading...` 占位块。当 token `done` 时 JSON 完整，图片 URL 解析成功，自动切换为 `<img>`。

### 扩展建议

可以添加加载状态和错误处理：

```vue
<script setup>
import { ref } from 'vue'

const loaded = ref(false)
const error = ref(false)
</script>

<template>
  <div class="image-token">
    <img
      v-if="imageData.url"
      :src="imageData.url"
      @load="loaded = true"
      @error="error = true"
      :style="{ opacity: loaded ? 1 : 0.3 }"
    />
    <div v-if="error" class="error">图片加载失败</div>
  </div>
</template>
```

---

## 外部链接 Token（LinkToken）

### 功能说明

外部链接 token 是一种 **inline token**，使用 `contentRegex` 匹配 `link{...}link` 语法，渲染为一个圆形 `?` 按钮。点击按钮弹出 popover，显示链接名称；点击名称在新标签页打开目标 URL。

> **注意：** token name 使用 `ext_link` 而非 `link`，避免与 markdown-it 内置的 `link`（即 `[text](url)`）token 类型冲突。

### 源码位置

[playground/src/components/LinkToken.vue](../src/components/LinkToken.vue)

### 完整代码

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import type { StatefulToken } from '@markdown-stream/core'

const props = defineProps<{ token: StatefulToken }>()

interface LinkData {
  url: string
  name?: string
}

const linkData = computed<LinkData>(() => {
  try {
    return JSON.parse(props.token.content || '{}')
  } catch {
    return { url: '', name: '' }
  }
})

const visible = ref(false)

function toggle(e: MouseEvent) {
  e.stopPropagation()
  visible.value = !visible.value
}

function navigate() {
  if (linkData.value.url) {
    window.open(linkData.value.url, '_blank', 'noopener,noreferrer')
    visible.value = false
  }
}

function close() {
  visible.value = false
}
</script>

<template>
  <span class="link-token" @click.stop>
    <button class="link-btn" :class="{ active: visible }" @click="toggle" :aria-label="linkData.name || '链接'">
      ?
    </button>
    <span v-if="visible" class="link-popover">
      <span class="link-popover-name" @click="navigate">{{ linkData.name || linkData.url }}</span>
      <button class="link-popover-close" @click="close">×</button>
    </span>
  </span>
</template>
```

### 注册配置

```ts
{
  name: 'ext_link',
  contentRegex: /^link(.+)link$/,  // 捕获组内容是 JSON 字符串
  component: markRaw(LinkToken),
}
```

### 数据格式

```markdown
访问 link{"url": "https://www.baidu.com", "name": "点击跳转百度"}link 了解更多。
```

JSON 字段说明：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `url` | string | 是 | 跳转目标 URL |
| `name` | string | 否 | popover 中显示的链接文字，缺省时显示 url |

### 交互行为

1. 行内渲染为一个 `?` 圆形按钮（紫色描边，18×18px）
2. 点击按钮：切换 popover 显示/隐藏
3. popover 显示在按钮上方，内含链接名称和关闭按钮
4. 点击链接名称：以 `_blank` 打开目标页面，并关闭 popover
5. 点击 `×`：仅关闭 popover

### 为什么 name 不能用 `link`

markdown-it 内部将 `[text](url)` 解析为 `link_open` / `link_close` token pair，经过 `INLINE_OPEN_CLOSE_MAP` 映射后统一变为 type `link` 的 StatefulToken。若自定义 token name 也叫 `link`，渲染层会把所有标准 Markdown 链接也交给 `LinkToken` 组件处理，产生冲突。改为 `ext_link` 后两者完全隔离。

---

## 对比：两种 Inline Token 定义方式

| 方式 | 适用场景 | 示例 |
|---|---|---|
| `openRegex`（无 `closeRegex`） | 匹配 fence 的 info 字段，内容是块级代码块 | ` ```image` `...` ` ``` ` |
| `contentRegex` | 匹配 inline 文本内容，嵌入段落中 | `pink文本pink` |
| `openRegex` + `closeRegex` | 匹配自定义 open/close token 对（非 fence） | `<custom>...</custom>` |
