# JSON Token

## 功能说明

JSON token 将 ` ```json` 代码块渲染为一个带格式化显示、一键复制和可选图片预览的深色卡片，代替默认的纯文本代码块。

特性：

- 流式输入中显示三点加载动画（JSON 尚不完整，无法解析）
- JSON 完整后自动格式化（`JSON.stringify(obj, null, 2)`）
- 支持一键复制到剪贴板
- 如果 JSON 中包含图片字段（`img` / `image` / `imageUrl`），自动在顶部预览图片
- 解析失败时显示原始文本（红色错误样式）

## 源码位置

[playground/src/components/JsonBlock.vue](../src/components/JsonBlock.vue)

## 注册配置

```ts
{
  name: 'json',
  openRegex: /^json$/,
  component: markRaw(JsonBlock),  // 三态统一使用同一组件
}
```

三态使用同一组件，由组件内部的 `computed` 根据 `token.content` 是否可解析来决定显示什么。

## 核心逻辑

```ts
// 尝试解析 JSON
const parsedJson = computed(() => {
  try {
    const content = props.token.content?.trim() || ''
    if (!content) return null
    return JSON.parse(content)
  } catch {
    return null        // 流式中途内容不完整，解析会失败
  }
})

// 格式化后的字符串
const formattedJson = computed(() => {
  if (!parsedJson.value) return ''
  return JSON.stringify(parsedJson.value, null, 2)
})

// 是否有解析错误（有内容但解析失败）
const hasError = computed(() =>
  !parsedJson.value && props.token.content?.trim()
)

// 提取图片 URL
const imgUrl = computed(() => {
  if (!parsedJson.value) return null
  const url = parsedJson.value.img
           || parsedJson.value.image
           || parsedJson.value.imageUrl
           || null
  if (url && typeof url === 'string' && url.startsWith('//')) {
    return 'https:' + url    // 补全协议
  }
  return url
})
```

## 三态视图逻辑

```vue
<!-- 有图片时在顶部预览 -->
<div v-if="imgUrl" class="json-image">
  <img :src="imgUrl" alt="JSON Image" />
</div>

<!-- 标题栏：JSON 徽标 + 复制按钮 -->
<div class="json-header">
  <span class="json-badge">JSON</span>
  <button v-if="parsedJson" @click="navigator.clipboard.writeText(formattedJson)">
    复制
  </button>
</div>

<!-- 解析成功：显示格式化 JSON -->
<pre v-if="parsedJson" class="json-content">
  <code>{{ formattedJson }}</code>
</pre>

<!-- 解析失败（但有内容）：红色错误样式 -->
<pre v-else-if="hasError" class="json-error">
  <code>{{ token.content }}</code>
</pre>

<!-- 无内容（流式开始阶段）：三点动画 -->
<div v-else class="json-loading">
  <span class="dots">...</span>
</div>
```

## Markdown 用法

````markdown
```json
{
  "name": "markdown-stream",
  "version": "0.1.8",
  "features": ["vue_sfc", "vue_preview", "json", "callout"],
  "enabled": true,
  "stats": {
    "users": 1234,
    "rating": 4.8
  }
}
```
````

### 包含图片的 JSON

````markdown
```json
{
  "title": "示例图片",
  "image": "https://example.com/photo.jpg",
  "description": "这是一张示例图片"
}
```
````

图片会显示在卡片顶部，`max-height: 200px`，`object-fit: contain`。

## 样式要点

```css
.json-block {
  background: #1e293b;    /* 深蓝黑色背景 */
  border-radius: 8px;
}

.json-header {
  background: #0f172a;    /* 更深的标题栏 */
  border-bottom: 1px solid #334155;
}

.json-badge {
  background: #4f46e5;    /* 靛蓝色徽标 */
  color: #a5b4fc;
}

.json-content {
  color: #e2e8f0;         /* 浅色文字 */
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
}

.json-error {
  color: #f87171;         /* 红色错误提示 */
}

/* 加载动画 */
.dots span {
  animation: bounce 0.6s infinite alternate;
}
@keyframes bounce {
  to { transform: translateY(-6px); }
}
```

## 扩展建议

### 语法高亮

可以集成 JSON 语法高亮，在 `done` 状态下区分 key、string、number、boolean 的颜色：

```vue
<script setup>
import { computed } from 'vue'

// 简单正则替换实现 JSON 高亮
const highlighted = computed(() => {
  return formattedJson.value
    .replace(/"([^"]+)":/g, '<span class="key">"$1":</span>')
    .replace(/: "([^"]+)"/g, ': <span class="string">"$1"</span>')
    .replace(/: (\d+\.?\d*)/g, ': <span class="number">$1</span>')
    .replace(/: (true|false|null)/g, ': <span class="literal">$1</span>')
})
</script>

<pre v-html="highlighted" />
```

### 折叠/展开

对于大型 JSON，可以添加折叠功能：

```vue
<details>
  <summary>JSON（{{ Object.keys(parsedJson).length }} 个字段）</summary>
  <pre>{{ formattedJson }}</pre>
</details>
```
