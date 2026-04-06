<script setup lang="ts">
import type { StatefulToken } from '@markdown-stream/core'
import { SfcRendererPending, VueSfcShadowRenderer } from '@markdown-stream/vue3'

defineProps<{ token: StatefulToken }>()
</script>

<template>
  <SfcRendererPending v-if="token.state !== 'done'" />
  <VueSfcShadowRenderer v-else :token="token" />
</template>
