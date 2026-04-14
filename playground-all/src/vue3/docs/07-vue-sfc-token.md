# Vue SFC Token（vue_sfc / vue_preview）

## 功能说明

这是最强大的自定义 Token 之一：让大模型生成的 Vue SFC 代码块**直接在页面中运行**。

- `vue_sfc`（fence info=`ui`）：使用 `@markdown-stream/vue3` 内置的 `VueSfcFenceRenderer`，完成后编译并渲染 SFC
- `vue_preview`（fence info=`preview`）：使用自定义 `PreviewRenderer`，展示代码内容（当前为文本预览）

---

## vue_sfc Token

### 注册配置

```ts
{
  name: 'vue_sfc',
  openRegex: /^ui$/,                         // 匹配 ```ui
  start:     markRaw(SfcRendererPending),    // 等待中
  streaming: markRaw(SfcRendererPending),   // 流式中（显示等待态）
  done:      markRaw(VueSfcFenceRenderer),  // 完成后编译执行
}
```

### Markdown 用法

````markdown
```ui
<template>
  <div class="counter-card">
    <h3 class="title">计数器</h3>
    <div class="row">
      <button class="btn" @click="count++">+1</button>
      <span class="value">当前值：<strong>{{ count }}</strong></span>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const count = ref(0)
</script>

<style scoped>
.counter-card { ... }
</style>
```
````

### 渲染效果

| 阶段 | 显示 |
|---|---|
| 流式输入中 | `SfcRendererPending`（等待/加载态，由库提供） |
| 代码完整闭合后 | `VueSfcFenceRenderer` 编译并执行 SFC，显示真实的可交互组件 |

### 注意事项

- SFC 代码必须完整且语法正确，才能成功编译
- 流式输入中因代码不完整，编译会失败，所以 `streaming` 态不执行渲染，只显示等待态
- 编译在浏览器端进行（`@vue/compiler-sfc`），需要确保包已安装
- 渲染的 SFC 是完全沙箱化的独立组件实例，有自己的响应式状态

### 与大模型配合使用

在 `DemoSfc`（对话 Demo）中，用户可以说「生成一个计数器」，大模型会返回包含 ` ```ui` 代码块的 Markdown，流式渲染完成后自动展示可交互组件。这是本库最核心的应用场景。

---

## vue_preview Token

### 注册配置

```ts
{
  name: 'vue_preview',
  openRegex: /^preview$/,               // 匹配 ```preview
  component: markRaw(PreviewRenderer), // 三态统一
}
```

### PreviewRenderer 组件

源码：[playground/src/components/PreviewRenderer.vue](../src/components/PreviewRenderer.vue)

```vue
<script setup lang="ts">
import type { StatefulToken } from '@markdown-stream/core'
const props = defineProps<{ token: StatefulToken }>()
</script>

<template>
  <div class="preview-block">
    <div class="preview-content">
      {{ token.content }}
    </div>
  </div>
</template>
```

当前实现是文本预览（橙色边框装饰块），展示原始代码内容。可以扩展为真正执行代码的预览容器（如 iframe 沙箱）。

### Markdown 用法

````markdown
```preview
<template>
  <div class="preview-box">
    <h4>预览组件</h4>
    <p>当前时间：{{ now }}</p>
  </div>
</template>

<script setup>
const now = new Date().toLocaleTimeString()
</script>
```
````

---

## CounterCard 组件

源码：[playground/src/components/CounterCard.vue](../src/components/CounterCard.vue)

这是一个独立的 Vue 组件，用作 `tokens.md` 中 SFC 示例的参考实现（大模型会生成类似的组件）：

```vue
<template>
  <div class="counter-card">
    <h3 class="title">计数器</h3>
    <div class="content">
      <button class="btn" @click="count++">+1</button>
      <span class="count">当前值：{{ count }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const count = ref(0)
</script>
```

特点：
- 渐变紫色背景（`linear-gradient(135deg, #667eea, #764ba2)`）
- 按钮悬停时有 `scale(1.05)` 放大效果
- `@click="count++"` 直接内联增量，无需额外函数

---

## 扩展：实现真正的在线代码执行

如果需要将 `vue_preview` 改为真正执行代码，可以参考如下思路：

```vue
<!-- PreviewRenderer.vue（增强版） -->
<script setup lang="ts">
import { defineAsyncComponent, ref, watch } from 'vue'
import { compile } from '@vue/compiler-dom'
import type { StatefulToken } from '@markdown-stream/core'

const props = defineProps<{ token: StatefulToken }>()
const component = ref<ReturnType<typeof defineAsyncComponent> | null>(null)

watch(() => [props.token.state, props.token.content], () => {
  if (props.token.state !== 'done') return
  // 仅在 done 状态执行编译
  try {
    const { code } = compile(props.token.content ?? '')
    const fn = new Function('Vue', code)
    component.value = { render: fn(Vue) }
  } catch (e) {
    console.warn('编译失败', e)
  }
}, { immediate: true })
</script>

<template>
  <component v-if="component" :is="component" />
  <div v-else class="loading">编译中...</div>
</template>
```
