<script setup>
import { ref, nextTick, onMounted } from 'vue'
import { chat } from '../services/api.js'
import MdRenderer from './md/MdRenderer.vue'

const messages = ref([
  {
    id: 1,
    role: 'assistant',
    content: '你好！我是GenUI助手。我可以根据你的需求生成Vue组件。比如你可以尝试说"生成一个计数器"或"创建一个用户反馈表单"。'
  }
])

const inputMessage = ref('')
const isLoading = ref(false)
const messagesContainer = ref(null)

// 发送消息
async function sendMessage() {
  if (!inputMessage.value.trim() || isLoading.value) return

  const userMessage = inputMessage.value.trim()
  inputMessage.value = ''

  // 添加用户消息
  messages.value.push({
    id: Date.now(),
    role: 'user',
    content: userMessage
  })

  // 滚动到底部
  await nextTick()
  scrollToBottom()

  // 添加一个临时的助手消息
  const tempId = Date.now() + 1
  messages.value.push({
    id: tempId,
    role: 'assistant',
    content: '',
    reasoning: '',
    isStreaming: false,
    isLoading: true
  })

  isLoading.value = true

  try {
    // 准备消息历史
    const history = messages.value
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role,
        content: m.content.replace(/```ui[\s\S]*?```/g, '[组件代码]')
      }))

    // 调用流式API
    const response = await chat(history, {
      onReasoning(reasoning) {
        const msg = messages.value.find(m => m.id === tempId)
        if (msg) {
          msg.reasoning = reasoning
        }
        nextTick(() => scrollToBottom())
      },
      onContent(content) {
        const msg = messages.value.find(m => m.id === tempId)
        if (msg) {
          msg.content = content
          msg.isLoading = false
          msg.isStreaming = true
        }
        nextTick(() => scrollToBottom())
      }
    })

    // 最终更新
    const msg = messages.value.find(m => m.id === tempId)
    if (msg) {
      msg.content = response.content
      msg.reasoning = response.reasoning
      msg.isLoading = false
      msg.isStreaming = false
    }

    await nextTick()
    scrollToBottom()
  } catch (error) {
    console.error('API错误:', error)

    let errorContent = '抱歉，发生了错误: ' + error.message

    if (error.message.includes('余额') || error.message.includes('balance')) {
      errorContent = `API余额不足，请检查配置文件中的API密钥。

错误详情: ${error.message}

请更新 src/services/api.js 中的 API_KEY`
    }

    const msg = messages.value.find(m => m.id === tempId)
    if (msg) {
      msg.content = errorContent
      msg.isLoading = false
      msg.isStreaming = false
    }
  } finally {
    isLoading.value = false
  }
}

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

function handleKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}

onMounted(() => {
  scrollToBottom()
})
</script>

<template>
  <div class="flex flex-col h-full bg-gray-50">
    <!-- 标题栏 -->
    <header class="bg-white border-b px-4 py-3 flex items-center justify-center">
      <h1 class="text-xl font-semibold text-gray-800">GenUI - AI生成界面</h1>
    </header>

    <!-- 消息列表 -->
    <div
      ref="messagesContainer"
      class="flex-1 overflow-y-auto p-4 space-y-4"
    >
      <div
        v-for="msg in messages"
        :key="msg.id"
        class="flex"
        :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
      >
        <div
          class="max-w-[80%] rounded-lg p-3"
          :class="msg.role === 'user'
            ? 'bg-blue-500 text-white'
            : 'bg-white border shadow-sm text-gray-800 min-w-[min(28rem,100%)]'"
        >
          <!-- 等待大模型回复：老的 loading -->
          <div v-if="msg.isLoading" class="space-y-2">
            <details v-if="msg.reasoning" class="text-sm" open>
              <summary class="text-gray-400 cursor-pointer select-none">思考中...</summary>
              <div class="mt-1 pl-3 border-l-2 border-gray-200 text-gray-400 whitespace-pre-wrap text-xs max-h-40 overflow-y-auto">{{ msg.reasoning }}</div>
            </details>
            <div v-else class="flex items-center gap-2">
              <span class="text-sm text-gray-500">思考中...</span>
              <div class="flex gap-1">
                <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.1s"></span>
                <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></span>
              </div>
            </div>
          </div>

          <!-- 流式输出中 / 已完成 -->
          <template v-else>
            <!-- 折叠显示 reasoning -->
            <details v-if="msg.reasoning" class="mb-2 text-sm" :open="msg.isStreaming">
              <summary class="text-gray-400 cursor-pointer select-none hover:text-gray-500">
                {{ msg.isStreaming ? '思考中...' : '查看思考过程' }}
              </summary>
              <div class="mt-1 pl-3 border-l-2 border-gray-200 text-gray-400 whitespace-pre-wrap text-xs max-h-40 overflow-y-auto">{{ msg.reasoning }}</div>
            </details>

            <MdRenderer :content="msg.content" :streaming="msg.isStreaming" />
          </template>
        </div>
      </div>
    </div>

    <!-- 输入框 -->
    <div class="bg-white border-t p-4">
      <div class="max-w-4xl mx-auto flex gap-2">
        <textarea
          v-model="inputMessage"
          @keydown="handleKeydown"
          placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
          rows="1"
          class="flex-1 border rounded-lg px-4 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        ></textarea>
        <button
          @click="sendMessage"
          :disabled="isLoading || !inputMessage.trim()"
          class="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          发送
        </button>
      </div>
    </div>
  </div>
</template>

