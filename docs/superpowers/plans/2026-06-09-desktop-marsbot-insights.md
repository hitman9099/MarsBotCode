# Desktop MarsbotCode Insights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Desktop 状态 popover 中增加 MarsbotCode 标签页，展示当前项目的沙箱状态、审计配置和最近审计记录。

**Architecture:** Desktop main 进程提供只读 insights API，负责读取当前项目目录下的 `marsbotcode.json/jsonc`、`.marsbotcode` 配置和 `.marsbot/audit` JSONL 文件。Preload 将 API 暴露给 renderer，`@opencode-ai/app` 的平台上下文扩展可选方法，状态 popover 通过当前路由目录请求数据并展示。

**Tech Stack:** Electron IPC、Solid、Bun test、TypeScript、现有 `@opencode-ai/ui` Tabs/Button/Icon 组件。

---

### Task 1: Desktop insights 纯模块

**Files:**
- Create: `packages/desktop/src/main/marsbot-insights.ts`
- Create: `packages/desktop/src/main/marsbot-insights.test.ts`

- [x] **Step 1: 写失败测试**

测试覆盖：

```ts
test("reports Windows weak sandbox and reads audit rows", async () => {
  const root = await mkdtemp(join(tmpdir(), "marsbot-insights-"))
  await writeFile(join(root, "marsbotcode.json"), JSON.stringify({
    sandbox: { enabled: true, mode: "os", allowedDomains: ["github.com"] },
    audit: { enabled: true, path: ".marsbot/audit" },
  }))
  await mkdir(join(root, ".marsbot/audit"), { recursive: true })
  await writeFile(join(root, ".marsbot/audit/2026-06-09.jsonl"), JSON.stringify({
    time: "2026-06-09T10:00:00.000Z",
    type: "tool",
    phase: "tool.after",
    tool: "bash",
    data: { title: "run tests" },
  }) + "\n")

  const result = await readMarsbotInsights(root, { platform: "win32", limit: 5 })

  expect(result.sandbox.status).toBe("weak")
  expect(result.sandbox.rows).toContainEqual(["Network rules", "configured, but per-domain enforcement is not available in OS mode yet"])
  expect(result.audit.enabled).toBe(true)
  expect(result.audit.records[0]?.tool).toBe("bash")
})
```

- [x] **Step 2: 运行测试确认失败**

Run: `bun test packages/desktop/src/main/marsbot-insights.test.ts`

Expected: FAIL because `marsbot-insights.ts` does not exist.

- [x] **Step 3: 实现最小模块**

实现：

- `readMarsbotInsights(directory, options)`
- JSON/JSONC 配置读取，优先级：`marsbotcode.jsonc`、`marsbotcode.json`、`.marsbotcode/marsbotcode.jsonc`、`.marsbotcode/marsbotcode.json`
- 沙箱状态：Windows weak、Linux bubblewrap available/missing、macOS sandbox-exec available/missing、disabled
- 审计状态：按配置路径读取最近 JSONL 行，失败行跳过

- [x] **Step 4: 测试通过**

Run: `bun test packages/desktop/src/main/marsbot-insights.test.ts`

Expected: PASS.

### Task 2: Electron/Platform 接入

**Files:**
- Modify: `packages/desktop/src/main/ipc.ts`
- Modify: `packages/desktop/src/main/index.ts`
- Modify: `packages/desktop/src/preload/types.ts`
- Modify: `packages/desktop/src/preload/index.ts`
- Modify: `packages/desktop/src/renderer/index.tsx`
- Modify: `packages/app/src/context/platform.tsx`

- [x] **Step 1: IPC 类型与 handler**

新增 `getMarsbotInsights(directory?: string)`，返回 Task 1 的结构化结果。

- [x] **Step 2: preload 暴露 API**

在 `window.api` 增加 `getMarsbotInsights(directory?: string)`。

- [x] **Step 3: app platform 增加可选方法**

`Platform` 增加 `getMarsbotInsights?(directory?: string): Promise<MarsbotInsights>`。

- [x] **Step 4: desktop renderer 传递方法**

`createPlatform()` 将该方法代理到 `window.api.getMarsbotInsights`。

### Task 3: 状态 popover UI

**Files:**
- Modify: `packages/app/src/components/status-popover-body.tsx`
- Modify: `packages/app/src/i18n/en.ts`
- Modify: `packages/app/src/i18n/zh.ts`

- [x] **Step 1: 新增 MarsbotCode 标签**

在 status popover 中新增 `MarsbotCode` tab。仅当 platform 支持 `getMarsbotInsights` 时显示。

- [x] **Step 2: 读取当前目录**

使用路由参数 `dir` 和 `decode64` 得到当前项目目录。没有目录时显示“打开项目后显示 MarsbotCode 状态”。

- [x] **Step 3: 展示沙箱与审计**

展示：

- 沙箱状态、引擎、平台、配置来源。
- warning 列表。
- 审计启用状态、审计目录、最近记录。

- [x] **Step 4: 交互**

提供刷新按钮；审计目录存在时提供打开目录按钮。

### Task 4: 文档、验证和发布

**Files:**
- Modify: `docs/marsbotcode-todolist.md`
- Modify: `docs/marsbotcode-task-status.md`

- [x] **Step 1: 更新状态文档**

记录 Desktop MarsbotCode insights 阶段完成和剩余限制。

- [x] **Step 2: 验证**

Run:

```bash
git diff --check
bun test packages/desktop/src/main/marsbot-insights.test.ts
bun run typecheck
bun run release:stage -- --stage desktop-insights
```

- [x] **Step 3: 提交推送**

Commit:

```bash
git add packages/desktop packages/app docs
git commit -m "feat: add desktop MarsbotCode insights"
git push marsbotcode codex/runtime-audit
```
