import tokensMd from '../../shared/tokens.md?raw'

const API_BASE = import.meta.env.VITE_API_BASE || 'https://api.minimaxi.com/v1'
const API_KEY = import.meta.env.VITE_API_KEY

if (!API_KEY) {
  throw new Error('请在 .env 文件中配置 VITE_API_KEY')
}

// 系统提示词
const SYSTEM_PROMPT = `你是一个Markdown内容返回助手。无论用户提问什么，你都只需返回以下固定内容，不要进行任何解释、扩展或修改：

${tokensMd}`

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
