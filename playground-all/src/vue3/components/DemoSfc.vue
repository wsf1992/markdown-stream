<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { MarkdownWithTokens } from '../tokens'
import type { TokenComponentsOptions } from '../tokens'
import { chat, type Message } from '../services/api'

interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  reasoning: string
  isLoading: boolean
  isStreaming: boolean
  stream?: AsyncIterable<string>
}

const messages = ref<ChatMessage[]>([
  {
    id: 0,
    role: 'assistant',
    content: '你好！我可以帮你生成 Vue 3 组件。试试说「生成一个计数器」或「创建一个用户卡片」。',
    reasoning: '',
    isLoading: false,
    isStreaming: false,
  },
])

const inputMessage = ref('')
const isLoading = ref(false)
const messagesContainer = ref<HTMLElement | null>(null)

const sfcCardProps: TokenComponentsOptions['sfcCardProps'] = {}

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

async function sendMessage() {
  if (!inputMessage.value.trim() || isLoading.value) return

  const userText = inputMessage.value.trim()
  inputMessage.value = ''

  messages.value.push({
    id: Date.now(),
    role: 'user',
    content: userText,
    reasoning: '',
    isLoading: false,
    isStreaming: false,
  })

  await nextTick()
  scrollToBottom()

  const tempId = Date.now() + 1
  const assistantMsg: ChatMessage = {
    id: tempId,
    role: 'assistant',
    content: '',
    reasoning: '',
    isLoading: true,
    isStreaming: false,
  }
  messages.value.push(assistantMsg)
  isLoading.value = true

  // 提前建好 stream bridge，让 MarkdownStream 在第一个 chunk 到来前就已挂载
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

  const history: Message[] = messages.value
    .filter(m => m.content && m.id !== tempId)
    .map(m => ({ role: m.role, content: m.content }))

  const msg = messages.value.find(m => m.id === tempId)!

  // 在调用 chat 前就挂载流式视图，避免第一批 chunk 到达时 Vue 还没重渲染
  msg.isLoading = false
  msg.isStreaming = true
  msg.stream = toAsyncIterable()

  let prevLength = 0

  chat(history, {
    onReasoning(reasoning) {
      msg.reasoning = reasoning
      nextTick(() => scrollToBottom())
    },
    onContent(content) {
      const delta = content.slice(prevLength)
      prevLength = content.length
      streamController.enqueue(delta)
      nextTick(() => scrollToBottom())
    },
  }).then(({ content, reasoning }) => {
    streamController.close()
    msg.content = content
    msg.reasoning = reasoning
    msg.isStreaming = false
    isLoading.value = false
    nextTick(() => scrollToBottom())
  }).catch(error => {
    streamController.close()
    msg.content = '抱歉，发生了错误: ' + error.message
    msg.isStreaming = false
    isLoading.value = false
  })
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}
</script>

<template>
  <div class="chat-layout">
    <!-- 消息列表 -->
    <div ref="messagesContainer" class="messages">
      <div
        v-for="msg in messages"
        :key="msg.id"
        class="message-row"
        :class="msg.role === 'user' ? 'user-row' : 'assistant-row'"
      >
        <div
          class="bubble"
          :class="msg.role === 'user' ? 'user-bubble' : 'assistant-bubble'"
        >
          <!-- 等待中 -->
          <div v-if="msg.isLoading" class="loading-state">
            <details v-if="msg.reasoning" open>
              <summary class="reasoning-label">思考中...</summary>
              <div class="reasoning-body">{{ msg.reasoning }}</div>
            </details>
            <div v-else class="dots">
              <span></span><span></span><span></span>
            </div>
          </div>

          <!-- 流式 / 完成 -->
          <template v-else>
            <details v-if="msg.reasoning" class="reasoning-block" :open="msg.isStreaming">
              <summary class="reasoning-label">
                {{ msg.isStreaming ? '思考中...' : '查看思考过程' }}
              </summary>
              <div class="reasoning-body">{{ msg.reasoning }}</div>
            </details>

            <span v-if="msg.role === 'user'">{{ msg.content }}</span>
            <MarkdownWithTokens
              v-else-if="msg.stream && msg.isStreaming"
              :content="msg.stream"
              :debug="true"
              :sfc-card-props="sfcCardProps"
            />
            <MarkdownWithTokens
              v-else-if="msg.content"
              :content="msg.content"
              :debug="true"
              :sfc-card-props="sfcCardProps"
            />
          </template>
        </div>
      </div>
    </div>

    <!-- 输入框 -->
    <div class="input-area">
      <textarea
        v-model="inputMessage"
        @keydown="handleKeydown"
        placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
        rows="1"
      />
      <button :disabled="isLoading || !inputMessage.trim()" @click="sendMessage">
        发送
      </button>
    </div>
  </div>
</template>

<style scoped>
.chat-layout {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 60px);
  max-width: 860px;
  margin: 0 auto;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message-row { display: flex; }
.user-row { justify-content: flex-end; }
.assistant-row { justify-content: flex-start; }

.bubble {
  max-width: 80%;
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 14px;
  line-height: 1.6;
}
.user-bubble {
  background: #3b82f6;
  color: #fff;
  white-space: pre-wrap;
}
.assistant-bubble {
  background: #fff;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0,0,0,.06);
  color: #1f2937;
  min-width: min(28rem, 100%);
}

.loading-state { display: flex; align-items: center; gap: 8px; }
.dots { display: flex; gap: 4px; }
.dots span {
  width: 8px; height: 8px;
  background: #9ca3af;
  border-radius: 50%;
  animation: bounce 0.6s infinite alternate;
}
.dots span:nth-child(2) { animation-delay: .15s; }
.dots span:nth-child(3) { animation-delay: .3s; }
@keyframes bounce { to { transform: translateY(-6px); } }

.reasoning-block { margin-bottom: 8px; font-size: 13px; }
.reasoning-label { color: #9ca3af; cursor: pointer; user-select: none; }
.reasoning-label:hover { color: #6b7280; }
.reasoning-body {
  margin-top: 4px;
  padding-left: 10px;
  border-left: 2px solid #e5e7eb;
  color: #9ca3af;
  white-space: pre-wrap;
  font-size: 12px;
  max-height: 160px;
  overflow-y: auto;
}

.input-area {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #e5e7eb;
  background: #fff;
}
.input-area textarea {
  flex: 1;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 8px 12px;
  resize: none;
  font-size: 14px;
  outline: none;
}
.input-area textarea:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px #bfdbfe; }
.input-area button {
  padding: 8px 20px;
  background: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: background .2s;
}
.input-area button:hover:not(:disabled) { background: #2563eb; }
.input-area button:disabled { opacity: .5; cursor: not-allowed; }
</style>
