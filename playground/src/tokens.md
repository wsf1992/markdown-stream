# Token 演示

这是一段**粗体高亮**文字（已自定义为黄色背景），用于强调重要信息。

pink这是粉色高亮文本pink，用于警示和强调关键内容。

## 代码块（fence）- 三态渲染

```ts
function greet(name: string) {
  return `Hello, ${name}!`
}
```

## Vue SFC 代码块

```ui
<template>
  <div class="counter-card">
    <h3 class="title">计数器</h3>
    <div class="row">
      <button type="button" class="btn" @click="count++">+1</button>
      <span class="value">当前值：<strong>{{ count }}</strong></span>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const count = ref(0)
</script>

<style scoped>
.counter-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px 22px;
  max-width: 320px;
  border-radius: 14px;
  background: linear-gradient(145deg, #ffffff 0%, #f4f6fb 100%);
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.06),
    0 8px 24px rgba(15, 23, 42, 0.08);
}

.title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: #0f172a;
}

.row {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.btn {
  cursor: pointer;
  border: none;
  border-radius: 10px;
  padding: 10px 18px;
  font-size: 0.95rem;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(180deg, #3b82f6 0%, #2563eb 100%);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.2) inset,
    0 2px 6px rgba(37, 99, 235, 0.35);
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease,
    filter 0.15s ease;
}

.btn:hover {
  filter: brightness(1.05);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.25) inset,
    0 4px 14px rgba(37, 99, 235, 0.45);
}

.btn:active {
  transform: translateY(1px);
  box-shadow:
    0 1px 0 rgba(0, 0, 0, 0.08) inset,
    0 2px 4px rgba(37, 99, 235, 0.3);
}

.value {
  font-size: 0.95rem;
  color: #475569;
}

.value strong {
  font-variant-numeric: tabular-nums;
  color: #0f172a;
  font-size: 1.05em;
}
</style>
```

## Vue 预览代码块

```preview
<template>
  <div class="preview-box">
    <h4>预览组件</h4>
    <p>当前时间：{{ now }}</p>
  </div>
</template>

<script setup>
const now = new Date().toLocaleTimeString()
<\/script>
```

## JSON 代码块

```json
{
  "name": "markdown-stream",
  "version": "0.1.8",
  "features": ["vue_sfc", "vue_preview", "json", "callout", "inline_highlight"],
  "enabled": true,
  "stats": {
    "users": 1234,
    "rating": 4.8
  }
}
```

## Callout 提示块

```callout-info
这是一条提示信息，用于展示重要提示内容。
```

```callout-warning
请注意这个警告内容，**pink这是警告中的粉色高亮pink**。
```

```callout-danger
危险操作，请确认！这是一个 **pink危险警告pink** 示例。
```

## 列表

- 苹果
- 香蕉
- 橙子

1. 第一步
2. 第二步
3. 第三步

## 引用

> 这是一段引用文字，来自某位智者。里面也可以有 **粉色高亮 pink重点内容pink**。

## 图片 Token

```image
{"url": "https://img0.baidu.com/it/u=3591665277,2616537962&fm=253&app=138&f=JPEG?w=800&h=1333", "name": "图片名称"}
```

## 链接

访问 [GitHub](https://github.com) 了解更多。
