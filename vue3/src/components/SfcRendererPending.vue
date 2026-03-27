<template>
  <div class="my-4 rounded-lg border border-gray-200 genui-sfc-loading">
    <div class="sk-body">
      <div class="sk-header">
        <div class="sk-avatar"></div>
        <div class="sk-header-lines">
          <div class="sk-block sk-title"></div>
          <div class="sk-block sk-subtitle"></div>
        </div>
      </div>
      <div class="sk-block sk-banner"></div>
    </div>
  </div>
</template>

<style>

/* ===== SFC 组件生成 Loading：骨架动画 ===== */
.genui-sfc-loading {
  margin: var(--ms-sfc-loading-margin, 12px 0);
  border-radius: var(--ms-sfc-loading-radius, 12px);
  background: var(--ms-sfc-loading-bg, #ffffff);
  border: 1px solid var(--ms-sfc-loading-border, #e2e8f0);
  overflow: hidden;
}
.genui-sfc-loading .sk-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.genui-sfc-loading .sk-block {
  border-radius: 6px;
  background: linear-gradient(
    90deg,
    var(--ms-sfc-loading-skeleton-start, #f1f5f9) 25%,
    var(--ms-sfc-loading-skeleton-end, #f8fafc) 50%,
    var(--ms-sfc-loading-skeleton-start, #f1f5f9) 75%
  );
  background-size: 400% 100%;
  animation: sk-wave 1.8s ease-in-out infinite;
  animation-fill-mode: both;
}
.genui-sfc-loading .sk-header {
  display: flex;
  align-items: center;
  gap: 12px;
}
.genui-sfc-loading .sk-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(
    90deg,
    var(--ms-sfc-loading-skeleton-start, #f1f5f9) 25%,
    var(--ms-sfc-loading-skeleton-end, #f8fafc) 50%,
    var(--ms-sfc-loading-skeleton-start, #f1f5f9) 75%
  );
  background-size: 400% 100%;
  animation: sk-wave 1.8s ease-in-out infinite;
  animation-fill-mode: both;
  flex-shrink: 0;
}
.genui-sfc-loading .sk-header-lines {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.genui-sfc-loading .sk-title {
  height: 12px;
  width: 40%;
  animation-delay: 0.1s;
}
.genui-sfc-loading .sk-subtitle {
  height: 8px;
  width: 25%;
  animation-delay: 0.2s;
}
.genui-sfc-loading .sk-banner {
  height: 120px;
  width: 100%;
  border-radius: 10px;
  animation-delay: 0.3s;
}
@keyframes sk-wave {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
