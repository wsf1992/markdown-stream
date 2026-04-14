# 自定义 Token 演示（Vue 2）

## 内置链接

张三本月消费金额为 12800 元，李四消费金额为 8500 元。

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
  "version": "0.1.0",
  "vue": "2.7",
  "features": ["custom_tokens", "streaming", "inline_highlight"]
}
```

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

image{"url": "https://img0.baidu.com/it/u=3591665277,2616537962&fm=253&app=138&f=JPEG?w=800&h=1333", "name": "示例图片"}image

---

## 外部链接 Token

外部链接前置内容link{"url": "https://www.baidu.com", "name": "点击跳转百度"}link外部链接后置内容

---

## 表格

| 维度 | 需求 |
|------|------|
| 框架版本 | Vue 2.7 |
| 渲染方式 | 流式 / 一次性 |
| 自定义 Token | 支持 |
| TypeScript | 支持 |

---

好的！需求已确认，以下是示例产品方案：

## 🎯 产品方案建议

### 资产配置

| 资产类别 | 配置比例 | 说明 |
|----------|----------|------|
| 固收类仓位 | ≥**80%** | 债券打底，追求稳健收益 |
| 打新策略仓位 | ~**15%** | 科创板/主板新股申购 |
| 衍生品仓位 | ≤**5%** | 风险对冲工具 |
