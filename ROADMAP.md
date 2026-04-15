# markdown-stream 稳定性路线图

> 更新时间：2026-04-15

---

## 项目整体定位

`markdown-stream` 是一个专为 **LLM 流式输出场景**设计的 Markdown 渲染库，核心能力是将逐块到来的文本稳定地解析为带状态（`start` / `streaming` / `done`）的 token 树，并通过框架层平滑渲染，避免 DOM 抖动。

---

## 各包成熟度评分

| 包 | 版本 | 评分 | 核心问题 |
|---|---|---|---|
| `@markdown-stream/core` | 0.1.10 | **8/10** | 近乎稳定 |
| `@markdown-stream/vue3` | 0.1.28 | **5/10** | 测试失败、包体积过大 |
| `@markdown-stream/react` | 0.1.0 | **4/10** | 测试覆盖率极低 |
| `@markdown-stream/vue2` | 0.1.0 | **2/10** | 没有测试、被孤立 |

---

## 待完成工作

### P0 — 必须修复（阻塞发布）

- [x] **#1 Vue3 测试套件修复**（5 个用例失败 → 40/40 全绿）
  - 修复 `MarkdownTokenNode` inject 同时接受 `ComputedRef` 和普通对象
  - 在 `VueSfcFenceRenderer` 模板中补充 `.ms-sfc-card-title` 元素
  - 在 `CustomTokenDefinition` 加 `done` / `streaming` / `start` 字段，`makeStateRouter` 实现 state 路由

- [x] **#2 Vue3 API 清理**
  - `source` / `stream` props 加 `@deprecated` 标记，保持向后兼容
  - `components` 的 `Record<string, Component>` 格式加 `@deprecated`，推荐迁移至数组格式

- [x] **#3 Vue3 包体积优化**（3 MB → 18 KB）
  - 从 `index.ts` 移除 `VueSfcFenceRenderer`、`VueSfcShadowRenderer`、`SfcRendererPending` 的导出
  - 从 `package.json` 移除 `@vue/compiler-sfc`（dependencies）、`vue3-sfc-loader`、`@tailwindcss/browser`（devDependencies）
  - 打包产物：**18 KB / gzip 5.19 KB**（原 3.0 MB / 857 KB，缩减 165×）

- [x] **#4 React 测试补全**（1 个测试 → 33/33 全绿）
  - `MarkdownStream.test.tsx`：扩展至 11 个用例（字符串渲染、流式、自定义组件、错误展示、className 等）
  - `MarkdownTokenNode.test.tsx`：新增 9 个用例（各 token 类型渲染、data-state、context 注入）
  - `use-markdown-stream.test.ts`：新增 7 个用例（parse/write/reset/consume/cancel/error）
  - `custom-token.test.tsx`：新增 5 个用例（数组格式、openRegex fence、多 token 并存）

- [ ] **#5 添加 CI/CD 流水线**
  - 当前完全没有 GitHub Actions
  - 需要：PR 自动触发 test + typecheck，阻塞合并

---

### P1 — 高优先级

- [ ] **#6 Vue2 命运决策**
  - 未纳入根目录 workspace，`npm test` 不覆盖它
  - 没有任何测试，Vue 2 已官方 EOL
  - 选项：正式维护 or 从仓库移除

- [ ] **#7 文档补全**
  - Root `README.md` 版本信息过时，缺少 vue2/react 包说明
  - Vue2 包缺少 README
  - 所有包缺少 JSDoc / TypeDoc 类型注释

- [ ] **#8 发布流程完善**
  - 缺少 `CHANGELOG.md`
  - 没有自动化版本管理（建议引入 changesets 或 release-it）
  - 缺少 lint 配置（eslint + prettier）

---

### P2 — 锦上添花

- [ ] **#9 SSR / Hydration 验证**（Vue3 + React）
- [ ] **#10 大文档性能基准测试**（目标：10k tokens 流式场景）
- [ ] **#11 React 包中 VueSfcFenceRenderer 可用性验证**

---

## 最短发布路径（Vue3 先行）

要让 Vue3 包达到 **beta 可发布**状态，按优先级执行：

```
Step 1  拆包 —— 将 VueSfcFenceRenderer 移入独立包，主包体积降至几十 KB
Step 2  修复 5 个失败测试
Step 3  废弃旧 API（source/stream props），只保留 content
Step 4  加 GitHub Actions（test + typecheck 门禁）
Step 5  补 CHANGELOG + 自动化版本管理
```

> `@markdown-stream/core` 当前已可独立稳定使用。
