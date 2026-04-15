# 自定义 Token 演示

## 内置
张三本月消费金额为 12800 元 [1](citation://call_abc?fields=客户|金额&values=张三|12800)， 李四消费金额为 8500 元 [2](citation://call_abc?fields=客户|金额&values=李四|8500)

## 内联高亮

这是一段 **粗体加粗** 文字，用于强调重要信息。

pink这是粉色高亮文本pink，用于警示和强调关键内容。

---

## 代码块 — 三态渲染

### TypeScript

```ts
function greet(name: string) {
  return `Hello, ${name}!`
}
```

### JSON

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

---

## Vue SFC 代码块

````ui
<template>
  <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-6">
    <div class="bg-white rounded-2xl shadow-lg shadow-slate-200/50 p-8 max-w-sm w-full border border-slate-100">
      <!-- 卡片头部图标 -->
      <div class="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/30">
        <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      
      <!-- 卡片标题 -->
      <h2 class="text-xl font-semibold text-slate-800 mb-3">
        快速开始
      </h2>
      
      <!-- 卡片描述 -->
      <p class="text-slate-500 leading-relaxed mb-6">
        开始探索无限可能，只需点击下方按钮即可开启你的创意之旅。
      </p>
      
      <!-- 卡片按钮 -->
      <button 
        @click="handleClick"
        class="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-slate-900/20 active:scale-[0.98]"
      >
        {{ buttonText }}
      </button>
      
      <!-- 底部装饰线 -->
      <div class="mt-6 flex items-center gap-3">
        <div class="flex-1 h-px bg-slate-200"></div>
        <span class="text-xs text-slate-400 uppercase tracking-wider">或者</span>
        <div class="flex-1 h-px bg-slate-200"></div>
      </div>
      
      <!-- 次要操作 -->
      <button class="w-full mt-4 py-2.5 text-slate-600 hover:text-slate-900 font-medium transition-colors duration-200">
        了解更多
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const buttonText = ref('开始探索')
const isLoading = ref(false)

const handleClick = async () => {
  isLoading.value = true
  buttonText.value = '加载中...'
  
  // 模拟加载效果
  setTimeout(() => {
    buttonText.value = '完成！'
    setTimeout(() => {
      buttonText.value = '开始探索'
      isLoading.value = false
    }, 1000)
  }, 1500)
}
</script>

<style scoped>
button:active {
  transform: scale(0.98);
}
</style>

````

---

## Vue SFC — Shadow DOM 渲染

````ui-shadow
<template>
  <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-6">
    <div class="bg-white rounded-2xl shadow-lg shadow-slate-200/50 p-8 max-w-sm w-full border border-slate-100">
      <!-- 卡片头部图标 -->
      <div class="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/30">
        <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      
      <!-- 卡片标题 -->
      <h2 class="text-xl font-semibold text-slate-800 mb-3">
        快速开始
      </h2>
      
      <!-- 卡片描述 -->
      <p class="text-slate-500 leading-relaxed mb-6">
        开始探索无限可能，只需点击下方按钮即可开启你的创意之旅。
      </p>
      
      <!-- 卡片按钮 -->
      <button 
        @click="handleClick"
        class="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-slate-900/20 active:scale-[0.98]"
      >
        {{ buttonText }}
      </button>
      
      <!-- 底部装饰线 -->
      <div class="mt-6 flex items-center gap-3">
        <div class="flex-1 h-px bg-slate-200"></div>
        <span class="text-xs text-slate-400 uppercase tracking-wider">或者</span>
        <div class="flex-1 h-px bg-slate-200"></div>
      </div>
      
      <!-- 次要操作 -->
      <button class="w-full mt-4 py-2.5 text-slate-600 hover:text-slate-900 font-medium transition-colors duration-200">
        了解更多
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const buttonText = ref('开始探索')
const isLoading = ref(false)

const handleClick = async () => {
  isLoading.value = true
  buttonText.value = '加载中...'
  
  // 模拟加载效果
  setTimeout(() => {
    buttonText.value = '完成！'
    setTimeout(() => {
      buttonText.value = '开始探索'
      isLoading.value = false
    }, 1000)
  }, 1500)
}
</script>

<style scoped>
button:active {
  transform: scale(0.98);
}
</style>

````

---

## Vue Preview 代码块

````preview
<template>
  <div class="preview-box">
    <h4>预览组件</h4>
    <p>当前时间：{{ now }}</p>
  </div>
</template>

<script setup>
const now = new Date().toLocaleTimeString()
<\/script>
````

---

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

---

## 列表

**无序列表：**

- 苹果
- 香蕉
- 橙子

**有序列表：**

1. 第一步
2. 第二步
3. 第三步

---

## 引用

> 这是一段引用文字，来自某位智者。里面也可以有 **pink重点内容pink**。

---

## 图片 Token

image{"url": "https://img0.baidu.com/it/u=3591665277,2616537962&fm=253&app=138&f=JPEG?w=800&h=1333", "name": "图片名称"}image

---

## 外部链接 Token

外部链接前置内容link{"url": "https://www.baidu.com", "name": "点击跳转百度"}link外部链接后置内容

## Markdown 链接

访问 [GitHub](https://github.com) 了解更多。

好的！需求已确认，方案已形成。以下是万兴科技的**产品方案**：

---

## 🎯 万兴科技产品方案建议

### 客户需求回顾

| 维度 | 需求 |
|------|------|
| 客户名称 | 万兴科技集团股份有限公司（300624） |
| 联系人 | 王总（CFO） |
| 拟投资规模 | **4,000万元** |
| 投资期限 | 6个月以上 |
| 流动性要求 | 中等流动性 |
| 风险偏好 | 稳健型 |

---

### 📊 推荐方案

#### **广盈启新系列 · 打新产品组合**

| 项目 | 内容 |
|------|------|
| **预期年化收益** | **3.0%**（中性收益） |
| **产品类型** | 固收增强型 |
| **流动性** | 中等（封闭期运作） |
| **风险等级** | 稳健型 |

---

### 📈 资产配置

| 资产类别 | 配置比例 | 说明 |
|----------|----------|------|
| 固收类仓位 | ≥**80%** | 债券打底，追求稳健收益 |
| 打新策略仓位 | ~**15%** | 科创板/主板新股申购 |
| 衍生品仓位 | ≤**5%** | 风险对冲工具 |

---

### ✅ 下一步建议

| 步骤 | 操作 |
|------|------|
| 1 | 方案内部合规评审 |
| 2 | 拜访王总展示方案细节 |
| 3 | 完成产品合同签署 |
| 4 | 4000万资金划转到位 |

---

现在让我提交最终产出物：
