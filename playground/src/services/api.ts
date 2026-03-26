const API_BASE = import.meta.env.VITE_API_BASE || 'https://api.minimaxi.com/v1'
const API_KEY = import.meta.env.VITE_API_KEY

if (!API_KEY) {
  throw new Error('请在 .env 文件中配置 VITE_API_KEY')
}

// 系统提示词
const SYSTEM_PROMPT = `你是一个AI助手，能够根据用户的需求生成Vue 3单文件组件(SFC)代码。

当用户请求创建UI组件时，你应该生成完整的Vue SFC代码，包含：
1. template - 组件的HTML模板
2. script setup - 使用Composition API的脚本
3. style - 样式（使用Tailwind CSS）

重要规则：

1. 生成UI组件时，**必须同时使用三种格式**：
   - 第一步：先用 \`\`\`preview 展示渲染效果
   - 第二步：再用 \`\`\`ui 显示源代码
   - 第三步：如果需要返回结构化数据，可以用 \`\`\`json 格式
   格式如下：
\`\`\`preview
<template>
  <div>组件代码</div>
</template>
<script setup>
import { ref } from 'vue'
</script>
\`\`\`

\`\`\`ui
<template>
  <div>组件代码</div>
</template>
<script setup>
import { ref } from 'vue'
</script>
\`\`\`

\`\`\`json
{
  "componentName": "MyComponent",
  "props": ["title", "value"],
  "img": "https://www.baidu.com/img/PCtm_d9c8750bed0b3c7d089fa7d55720d6cf.png"
}
\`\`\`

2. \`\`\`preview、\`\`\`ui 和 \`\`\`json 的区别：
   - \`\`\`preview：页面中渲染出组件的实时预览效果
   - \`\`\`ui：显示可编辑的源代码代码块
   - \`\`\`json：渲染为格式化的 JSON 数据展示（带语法高亮和复制功能）

4. SFC代码必须是可以直接运行的完整代码，包括所有必要的import

5. 可以通过 import 引用预置组件，当前可用的预置组件：
   - Counter（计数器组件）: import Counter from '/preset/Counter.vue'
   使用示例：
   \`\`\`ui
   <template>
     <div class="p-4">
       <Counter />
     </div>
   </template>
   <script setup>
   import Counter from '/preset/Counter.vue'
   </script>
   \`\`\`

6. 组件运行环境中注入了 window.genui 对象，提供宿主应用的桥接API。所有API都是异步的，必须使用 await 调用。当前可用的API：
   - window.genui.demo() — 演示API，返回 { message: 'Hello from GenUI Bridge!' }
   在 script setup 中使用示例：
   \`\`\`
   const result = ref(null)
   const callDemo = async () => { result.value = await window.genui.demo() }
   \`\`\`

7. 如果用户只是普通聊天，不需要生成UI组件，直接回复即可

8. 外部库加载规则（非常重要）：
   - 组件运行在 iframe 沙箱中，没有 npm/bundler，不能使用 import 导入第三方库（预置组件除外）
   - 需要使用第三方库时，必须在 onMounted 中通过动态创建 <script> 标签从 CDN 加载
   - 必须使用全局构建版本（UMD），不要使用 ES Module 版本（type="module" 的 script 不会暴露全局变量）
   - 不要使用动态 import() 加载外部库，因为会被 sfc-loader 拦截导致报错
   - 常见库的 CDN 地址（全局构建版本）：
     - Three.js 核心: https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js （暴露 window.THREE）
     - Three.js OrbitControls: https://unpkg.com/three@0.134.0/examples/js/controls/OrbitControls.js （添加 THREE.OrbitControls）
     - Three.js 其他插件同理，使用 examples/js/ 目录下的全局版本
     - Chart.js: https://cdn.jsdelivr.net/npm/chart.js
     - D3.js: https://cdn.jsdelivr.net/npm/d3@7
     - Anime.js: https://cdn.jsdelivr.net/npm/animejs@3
     - GSAP: https://cdn.jsdelivr.net/npm/gsap@3
   - 加载单个库的示例：
   \`\`\`
   onMounted(() => {
     const script = document.createElement('script')
     script.src = 'https://cdn.jsdelivr.net/npm/chart.js'
     script.onload = () => {
       // 库加载完成后，通过 window.Chart 等全局变量使用
       initChart()
     }
     document.head.appendChild(script)
   })
   \`\`\`
   - 加载多个库（有依赖顺序）的示例：
   \`\`\`
   function loadScript(src) {
     return new Promise((resolve, reject) => {
       const s = document.createElement('script')
       s.src = src
       s.onload = resolve
       s.onerror = reject
       document.head.appendChild(s)
     })
   }
   onMounted(async () => {
     await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js')
     await loadScript('https://unpkg.com/three@0.134.0/examples/js/controls/OrbitControls.js')
     // 现在可以使用 THREE 和 THREE.OrbitControls
     initScene()
   })
   \`\`\`

9. 设计美学要求（非常重要）：
   - 追求精致、专业、现代的设计感，参考 Apple、Linear、Vercel 等产品的设计语言
   - 禁止使用廉价的紫色渐变、彩虹渐变等花哨效果
   - 配色要克制优雅：优先使用中性色（gray、slate、zinc）搭配一个主色调
   - 如需渐变，使用同色系微妙渐变（如 from-gray-50 to-white），不要跨色系
   - 注重留白、间距、圆角的一致性
   - 字体大小层次分明，标题用 font-semibold 而非 font-bold
   - 使用细边框（border-gray-200）和柔和阴影（shadow-sm）
   - 按钮、输入框等交互元素要有 hover/focus 过渡效果
   - 整体风格：简洁、清爽、高级感

请根据用户需求生成合适的回复。再次强调：**生成组件代码时必须同时使用 \`\`\`preview 和 \`\`\`ui 两种格式**，先用 preview 展示预览，再用 ui 显示源代码。如果需要返回结构化数据，可以使用 \`\`\`json 格式。`

export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ChatCallbacks {
  onReasoning?: (text: string) => void
  onContent?: (text: string) => void
  onDone?: (result: ChatResult) => void
}

export interface ChatResult {
  reasoning: string
  content: string
}

async function callApiStream(messages: Message[], callbacks: ChatCallbacks = {}): Promise<ChatResult> {
  // 将系统提示词添加到消息开头
  const messagesWithSystem: Message[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages,
  ]

  const response = await fetch(`${API_BASE}/text/chatcompletion_v2`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: 'MiniMax-M2.7',
      messages: messagesWithSystem,
      stream: true,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const errorMsg = (errorData as any)?.base_resp?.status_msg
      || (errorData as any)?.error?.message
      || `API请求失败: ${response.status}`

    if (response.status === 402 || errorMsg.includes('balance') || errorMsg.includes('余额')) {
      throw new Error('API余额不足，请检查API密钥或充值')
    }
    throw new Error(errorMsg)
  }

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let reasoning = ''
  let content = ''
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop()!

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith('data:')) continue
      const data = trimmed.slice(5).trim()
      if (data === '[DONE]') continue

      try {
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
      } catch {
        // ignore
      }
    }
  }

  const result = { reasoning, content }
  callbacks.onDone?.(result)
  return result
}

export async function chat(messages: Message[], callbacks: ChatCallbacks = {}): Promise<ChatResult> {
  const result = await callApiStream(messages, callbacks)

  if (result.content) return result

  // content 为空时带 reasoning 继续调用
  if (result.reasoning) {
    const continued = await callApiStream(
      [
        ...messages,
        { role: 'assistant', content: result.reasoning },
        { role: 'user', content: '请继续' },
      ],
      {
        onReasoning(text) { callbacks.onReasoning?.(result.reasoning + '\n' + text) },
        onContent(text) { callbacks.onContent?.(text) },
      }
    )
    return {
      reasoning: result.reasoning + (continued.reasoning ? '\n' + continued.reasoning : ''),
      content: continued.content || continued.reasoning || '',
    }
  }

  return result
}
