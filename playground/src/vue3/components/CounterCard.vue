<template>
  <div class="counter-card">
    <h3 class="title">计数器</h3>
    <div class="content">
      <button class="btn" @click="count++">+1</button>
      <span class="count">当前值：{{ count }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const count = ref(0)
</script>

<style scoped>
.counter-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 24px;
  color: #fff;
  box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
}
.title {
  margin: 0 0 16px;
  font-size: 20px;
  font-weight: 600;
}
.content {
  display: flex;
  align-items: center;
  gap: 16px;
}
.btn {
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.5);
  border-radius: 12px;
  color: #fff;
  font-size: 18px;
  font-weight: 600;
  padding: 8px 20px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}
.btn:active {
  transform: scale(0.95);
}
.count {
  font-size: 16px;
  font-weight: 500;
  opacity: 0.9;
}
</style>
