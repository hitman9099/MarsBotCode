# Desktop 工作台总览 MVP 实施计划

> **给执行 Agent 的要求：** 必须使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans` 按任务执行。步骤使用复选框（`- [ ]`）跟踪状态。

**目标：** 在 MarsbotCode Desktop 中新增可发布的工作台总览 MVP，让用户从 MarsbotCode 状态入口查看当前项目、会话、文件树、终端、沙箱和审计模块的就绪状态，并能进入对应工作流。

**架构：** App 层新增纯函数 `buildMarsbotWorkbenchSummary` 生成工作台状态卡片，UI 层新增 `DialogMarsbotWorkbench` 消费该状态并复用现有 Layout、Session、FileTree、Terminal、Audit 能力。Desktop 不重新实现 Agent，只在现有工作台能力之上提供 Beta 总览入口。

**技术栈：** Solid、Bun test、Electron preload 既有 Platform API、`@opencode-ai/ui` Dialog/Button/Icon、现有 `useLayout` / `useSync` / `usePlatform` 上下文。

---

### Task 1：工作台状态纯逻辑

**文件：**
- 新建：`packages/app/src/components/marsbot-workbench-summary.ts`
- 新建：`packages/app/src/components/marsbot-workbench-summary.test.ts`

- [x] **Step 1：写失败测试**

测试内容：

```ts
import { describe, expect, test } from "bun:test"
import { buildMarsbotWorkbenchSummary } from "./marsbot-workbench-summary"

describe("buildMarsbotWorkbenchSummary", () => {
  test("reports empty project state when no directory is selected", () => {
    const result = buildMarsbotWorkbenchSummary({
      directory: undefined,
      sessions: [],
      fileTreeOpen: false,
      terminalOpen: false,
      insights: undefined,
    })

    expect(result.projectName).toBe("No project")
    expect(result.metrics).toEqual([
      { label: "Sessions", value: "0" },
      { label: "File tree", value: "Closed" },
      { label: "Terminal", value: "Closed" },
      { label: "Sandbox", value: "Unknown" },
    ])
    expect(result.modules.find((item) => item.id === "project")?.status).toBe("blocked")
  })

  test("summarizes ready workbench modules for an active project", () => {
    const result = buildMarsbotWorkbenchSummary({
      directory: "E:/repo/app",
      sessions: [
        { id: "ses_2", title: "Fix checkout", updated: 20 },
        { id: "ses_1", title: "Older task", updated: 10 },
      ],
      fileTreeOpen: true,
      terminalOpen: true,
      insights: {
        sandbox: { status: "weak", message: "Windows weak mode" },
        audit: { enabled: true, records: [{ phase: "tool.after" }] },
      },
    })

    expect(result.projectName).toBe("app")
    expect(result.recentSessions.map((item) => item.id)).toEqual(["ses_2", "ses_1"])
    expect(result.modules.map((item) => [item.id, item.status])).toContainEqual(["audit", "ready"])
    expect(result.modules.map((item) => [item.id, item.status])).toContainEqual(["sandbox", "warning"])
  })
})
```

- [x] **Step 2：确认测试失败**

运行：

```bash
bun test src/components/marsbot-workbench-summary.test.ts
```

预期：失败，原因是模块文件尚不存在。

- [x] **Step 3：实现最小逻辑**

实现：
- 项目名从目录 basename 提取。
- 会话按 `updated` 倒序取最近 6 条。
- 模块状态覆盖 Project、Agent Chat、Sessions、Files、Terminal、Sandbox、Audit。
- 指标覆盖 Sessions、File tree、Terminal、Sandbox。

- [x] **Step 4：确认测试通过**

运行：

```bash
bun test src/components/marsbot-workbench-summary.test.ts
```

### Task 2：Desktop 工作台总览弹窗

**文件：**
- 新建：`packages/app/src/components/dialog-marsbot-workbench.tsx`
- 修改：`packages/app/src/components/status-popover-body.tsx`

- [x] **Step 1：新增 `DialogMarsbotWorkbench`**

弹窗需要包含：
- 标题：`MarsbotCode Workbench`
- 当前项目摘要和 4 个指标
- 模块状态网格：Project、Agent Chat、Sessions、Files、Terminal、Sandbox、Audit
- 最近会话列表，点击可跳转会话
- 操作按钮：New session、Open home、Open file tree、Toggle terminal、View audit log
- 无项目时显示打开项目提示

- [x] **Step 2：接入 MarsbotCode 状态 popover**

在 MarsbotCode tab 中新增 `Open workbench` 按钮，通过动态 import 打开弹窗，并传入：
- 当前目录
- 当前路由 session id
- 最近 session 列表
- file tree 开关状态
- terminal 开关状态
- Marsbot insights
- 跳转/打开入口回调

### Task 3：验证、发布和记录

**文件：**
- 修改：`docs/marsbotcode-todolist.md`
- 修改：`docs/marsbotcode-task-status.md`
- 修改：`docs/superpowers/plans/2026-06-10-desktop-workbench-overview.md`

- [x] **Step 1：运行验证**

运行：

```bash
git diff --check
bun test src/components/marsbot-workbench-summary.test.ts
bun run typecheck
bun run release:stage -- --stage desktop-workbench-overview
```

- [x] **Step 2：验证发布包**

检查：
- CLI zip 解压后 `bin\marsbotcode.cmd --version` 输出阶段版本。
- Desktop zip 包含 `MarsbotCode Beta.exe` 和 `resources/app.asar`。
- `manifest.json` 记录阶段名 `desktop-workbench-overview`。

- [x] **Step 3：更新文档并提交推送**

提交：

```bash
git add packages/app docs
git commit -m "feat: add desktop workbench overview"
git push marsbotcode codex/runtime-audit
```
