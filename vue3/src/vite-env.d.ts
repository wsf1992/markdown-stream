/// <reference types="vite/client" />

declare module 'vue/dist/vue.global.prod.js?raw' {
  const content: string
  export default content
}

declare module 'vue3-sfc-loader/dist/vue3-sfc-loader.js?raw' {
  const content: string
  export default content
}

declare module '@tailwindcss/browser?raw' {
  const content: string
  export default content
}
