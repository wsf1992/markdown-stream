# 与大模型对话（DemoSfc）

## 功能说明

这是最完整的使用场景：接入 MiniMax 大模型 API，用户输入消息后，AI 回复以流式方式实时渲染 Markdown，并支持显示 `reasoning`（思考过程）内容。

特性：

- 聊天气泡布局（用户右侧蓝色、AI 左侧白色）
- AI 回复流式渲染（`AsyncIterable<string>` 驱动 `MarkdownStream`）
- 思考过程折叠展示（`<details>` + `reasoning_content`）
- 加载中三点动画
- 完成后切换为静态字符串渲染，节省资源

## 源码位置

[playground/src/components/DemoSfc.vue](../src/components/DemoSfc.vue)
[playground/src/services/api.ts](../src/services/api.ts)

---

## 消息数据结构

```ts
interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  content: string         // 最终完整内容（完成后赋值）
  reasoning: string       // 思考过程文本
  isLoading: boolean      // 等待第一个 token（显示三点动画）
  isStreaming: boolean     // 正在流式输出
  stream?: AsyncIterable<string>  // 流式数据源，streaming 阶段使用
}
```

---

## 发送消息流程

### 1. 创建 stream bridge（关键技巧）

```ts
let streamController!: ReadableStreamDefaultController<string>
const readable = new ReadableStream<string>({
  start(ctrl) { streamController = ctrl },
})

async function* toAsyncIterable(): AsyncGenerator<string> {
  const reader = readable.getReader()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      yield value
    }
  } finally {
    reader.releaseLock()
  }
}
```

之所以用这个 bridge 而不是直接用原始流，是为了**在 API 请求发出前就挂载 `MarkdownStream` 组件**。
如果等第一批 chunk 到来后再切换到流式视图，Vue 的重渲染还没发生，会丢失最早的几个 chunk。

### 2. 提前挂载流式视图

```ts
msg.isLoading = false
msg.isStreaming = true
msg.stream = markRaw(toAsyncIterable())  // 先挂载，此时流还是空的
```

挂载后，`MarkdownStream` 组件已经开始监听迭代器，后续只要 `streamController.enqueue(delta)` 就能立刻看到更新。

### 3. 调用 API，逐 chunk 推入

```ts
chat(history, {
  onContent(content) {
    const delta = content.slice(prevLength)  // 差量计算
    prevLength = content.length
    streamController.enqueue(delta)
    nextTick(() => scrollToBottom())
  },
}).then(({ content, reasoning }) => {
  streamController.close()
  msg.content = content      // 保存完整内容
  msg.isStreaming = false    // 切换回静态渲染
  isLoading.value = false
})
```

API 的 `onContent` 回调接收到的是**累积内容**（不是增量），所以用 `content.slice(prevLength)` 手动切出增量再推入流。

### 4. 完成后切换为静态渲染

```vue
<!-- 流式阶段 -->
<MarkdownWithTokens
  v-if="msg.stream && msg.isStreaming"
  :content="msg.stream"
/>

<!-- 完成后静态渲染 -->
<MarkdownWithTokens
  v-else-if="msg.content"
  :content="msg.content"
/>
```

完成后 `isStreaming = false`，组件切换为字符串模式，`stream` 迭代器被释放，节省内存。

---

## API 服务层（api.ts）

### 环境变量配置

```
VITE_API_BASE=https://api.minimaxi.com/v1   # 可选，默认已内置
VITE_API_KEY=your_api_key_here              # 必填
```

### SSE 解析

```ts
const reader = response.body!.getReader()
const decoder = new TextDecoder()
let buffer = ''

while (true) {
  const { done, value } = await reader.read()
  if (done) break

  buffer += decoder.decode(value, { stream: true })
  const lines = buffer.split('\n')
  buffer = lines.pop()!   // 保留未完成的行

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('data:')) continue
    const data = trimmed.slice(5).trim()
    if (data === '[DONE]') continue

    const parsed = JSON.parse(data)
    const delta = parsed.choices?.[0]?.delta

    if (delta?.reasoning_content) {
      reasoning += delta.reasoning_content
      callbacks.onReasoning?.(reasoning)
    }
    if (delta?.content) {
      content += delta.content
      callbacks.onContent?.(content)
    }
  }
}
```

这是标准的 SSE 流解析写法：用 `buffer` 暂存跨帧的不完整行，`lines.pop()` 保留最后一个可能未完结的行，下次循环继续拼接。

### content 为空时的重试

部分大模型（如带推理功能的模型）可能只返回 `reasoning_content`，`content` 为空。此时 api.ts 会自动追加历史并续问：

```ts
if (!result.content && result.reasoning) {
  const continued = await callApiStream(
    [
      ...messages,
      { role: 'assistant', content: result.reasoning },
      { role: 'user', content: '请继续' },
    ],
    { ... }
  )
  return { reasoning: ..., content: continued.content }
}
```

---

## 思考过程（Reasoning）展示

```vue
<details v-if="msg.reasoning" class="reasoning-block" :open="msg.isStreaming">
  <summary class="reasoning-label">
    {{ msg.isStreaming ? '思考中...' : '查看思考过程' }}
  </summary>
  <div class="reasoning-body">{{ msg.reasoning }}</div>
</details>
```

- 流式阶段自动展开（`:open="msg.isStreaming"`）
- 完成后折叠，用户可点击展开查看完整思考过程

---

## 样式要点

| 类名 | 说明 |
|---|---|
| `.user-bubble` | 蓝色背景（`#3b82f6`），白色文字，右对齐 |
| `.assistant-bubble` | 白色背景，边框阴影，左对齐，最小宽度 28rem |
| `.dots` | 三个圆点弹跳动画，等待 AI 响应时显示 |
| `.reasoning-body` | 左边线装饰，灰色文字，最大高度 160px + 滚动 |

---

## 环境搭建

```bash
cd playground
cp .env.example .env
# 编辑 .env，填入 VITE_API_KEY
npm install
npm run dev
```
