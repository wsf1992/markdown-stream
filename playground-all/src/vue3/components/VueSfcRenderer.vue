<script setup lang="ts">
import type { StatefulToken } from '@markdown-stream/core'
import { SfcRendererPending, VueSfcFenceRenderer } from '@markdown-stream/vue3'
import type { VueSfcCardMetrics, VueSfcRenderSuccessPayload } from '@markdown-stream/vue3'

const props = defineProps<{
  token: StatefulToken
  metrics?: VueSfcCardMetrics
  onError?: (err: Error) => void
}>()

const emit = defineEmits<{
  (e: 'render-success', payload: VueSfcRenderSuccessPayload): void
}>()

function errorHandler(error: Error) {
  props.onError?.(error)
 if (props.token.meta?.streamStartTime !== props.token.meta?.streamDoneTime) return
  // 发送错误给大模型
  ;(window as any).genui.sendAgentMessage(error.message)
}
</script>

<template>
  <SfcRendererPending v-if="token.state !== 'done'" />
  <VueSfcFenceRenderer
    v-else
    :token="token"
    :metrics="metrics"
    :error-handler="errorHandler"
    @render-success="emit('render-success', $event)"
  />
</template>
