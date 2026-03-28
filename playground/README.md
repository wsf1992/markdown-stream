# markdown-stream playground

`@markdown-stream/vue3` 的交互式演示应用，基于 Vite + Vue 3 构建。

## 功能

包含四个演示标签页：

| 标签 | 说明 |
|------|------|
| 一次性渲染 | 将完整 Markdown 字符串一次性渲染 |
| 流式渲染 | 模拟逐块输入，展示自定义 token（代码骨架屏、Callout、JSON 块、图片、粉色高亮等） |
| 与大模型对话 | 接入真实 LLM 流式输出，渲染 Vue SFC 代码围栏（Preview / Code 双标签页） |
| 文档 | 内嵌 `@markdown-stream/vue3` 完整文档 |

## 快速启动

```bash
cd playground
npm install
npm run dev
```

## 技术栈

- [Vite](https://vitejs.dev/) `^5.0`
- [Vue 3](https://vuejs.org/) `^3.3`
- [`@markdown-stream/core`](../core) `^0.1.3`
- [`@markdown-stream/vue3`](../vue3) `^0.1.13`
