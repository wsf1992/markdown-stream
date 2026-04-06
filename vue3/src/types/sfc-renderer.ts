export interface VueSfcCardMetrics {
  tps?: number | null
  totalChars?: number | null
  elapsed?: number | null
  renderTime?: number | null
}

export interface VueSfcRenderSuccessPayload {
  renderTime: number
}
