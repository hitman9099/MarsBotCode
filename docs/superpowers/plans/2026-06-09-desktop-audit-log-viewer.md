# Desktop 审计日志查看器 MVP 实施计划

> **给执行 Agent 的要求：** 必须使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans` 按任务执行。步骤使用复选框（`- [ ]`）跟踪状态。

**目标：** 在 MarsbotCode Desktop 中增加可发布的审计日志查看器 MVP，让用户从状态 popover 打开完整审计日志弹窗，进行搜索、类型过滤、刷新和打开审计目录。

**架构：** Desktop main 进程新增只读 `readMarsbotAudit(directory, options)` 模块，复用 MarsbotCode 项目配置解析逻辑读取 `audit.path`。Electron IPC/preload/renderer/platform 暴露 `getMarsbotAudit`，App 层新增 `DialogMarsbotAudit` 弹窗。状态 popover 保留摘要，同时新增“View audit log”入口。

**技术栈：** Bun test、TypeScript、Electron IPC、Solid、现有 `@opencode-ai/ui` Dialog/Button/Icon 组件、MarsbotCode JSONC 配置。

---

### Task 1：审计日志读取纯模块

**文件：**
- 新建：`packages/desktop/src/main/marsbot-audit.ts`
- 新建：`packages/desktop/src/main/marsbot-audit.test.ts`
- 修改：`packages/desktop/src/main/marsbot-insights.ts`

- [x] **Step 1：写失败测试**

测试内容：

```ts
test("reads audit records with query and type filters", async () => {
  const root = await tempProject()
  await writeFile(
    join(root, "marsbotcode.jsonc"),
    `{
      "audit": { "enabled": true, "path": ".custom-audit" }
    }`,
  )
  await mkdir(join(root, ".custom-audit"), { recursive: true })
  await writeFile(
    join(root, ".custom-audit/2026-06-09.jsonl"),
    [
      JSON.stringify({ time: "2026-06-09T10:00:00.000Z", type: "tool", phase: "tool.after", tool: "bash", data: { title: "run tests" } }),
      "not-json",
      JSON.stringify({ time: "2026-06-09T10:01:00.000Z", type: "permission", phase: "permission.granted", tool: "bash", data: { pattern: "npm test" } }),
    ].join("\n") + "\n",
  )

  const result = await readMarsbotAudit(root, { query: "npm", type: "permission", limit: 20 })

  expect(result.enabled).toBe(true)
  expect(result.path).toBe(join(root, ".custom-audit"))
  expect(result.total).toBe(1)
  expect(result.skipped).toBe(1)
  expect(result.records[0]?.phase).toBe("permission.granted")
})
```

- [x] **Step 2：运行测试确认失败**

运行：

```bash
bun test src/main/marsbot-audit.test.ts
```

预期：失败，原因是 `marsbot-audit.ts` 尚不存在。

- [x] **Step 3：实现最小模块**

实现：

- `readMarsbotAudit(directory, options)`
- 支持 `limit`、`query`、`type`、`tool`
- 返回 `directory`、`enabled`、`path`、`total`、`returned`、`skipped`、`records`
- 读取 `audit.path`，未配置时默认 `.marsbot/audit`
- 审计关闭时返回空记录
- 坏 JSONL 行计入 `skipped`

- [x] **Step 4：测试通过**

运行：

```bash
bun test src/main/marsbot-audit.test.ts
```

预期：全部通过。

### Task 2：Electron 与 Platform 接入

**文件：**
- 修改：`packages/desktop/src/main/ipc.ts`
- 修改：`packages/desktop/src/preload/types.ts`
- 修改：`packages/desktop/src/preload/index.ts`
- 修改：`packages/desktop/src/renderer/index.tsx`
- 修改：`packages/app/src/context/platform.tsx`

- [x] **Step 1：新增 IPC handler**

新增：

```ts
ipcMain.handle("get-marsbot-audit", (_event, directory?: string, options?: MarsbotAuditReadOptions) =>
  readMarsbotAudit(typeof directory === "string" ? directory : undefined, options),
)
```

- [x] **Step 2：preload 暴露 API**

新增：

```ts
getMarsbotAudit: (directory, options) => ipcRenderer.invoke("get-marsbot-audit", directory, options)
```

- [x] **Step 3：platform 增加可选方法**

新增类型 `MarsbotAuditLog` 和：

```ts
getMarsbotAudit?(directory?: string, options?: MarsbotAuditReadOptions): Promise<MarsbotAuditLog>
```

- [x] **Step 4：desktop renderer 代理方法**

在 `createPlatform()` 返回值中新增：

```ts
getMarsbotAudit: (directory, options) => window.api.getMarsbotAudit(directory, options)
```

### Task 3：Desktop 审计日志弹窗 UI

**文件：**
- 新建：`packages/app/src/components/dialog-marsbot-audit.tsx`
- 修改：`packages/app/src/components/status-popover-body.tsx`

- [x] **Step 1：新增弹窗组件**

弹窗需要：

- 标题：`MarsbotCode Audit`
- 搜索输入框
- 类型过滤按钮：`All`、`Tool`、`Permission`、`Shell`
- 刷新按钮
- 打开审计目录按钮
- 审计记录列表，显示时间、phase/type、tool、title/command/pattern 和 JSON 摘要
- 无项目、无记录、加载失败状态

- [x] **Step 2：从状态 popover 打开弹窗**

在 `MarsbotCodePanel` 中新增 `View audit log` 按钮，动态导入 `dialog-marsbot-audit.tsx`：

```ts
void import("./dialog-marsbot-audit").then((x) => {
  dialog.show(() => <x.DialogMarsbotAudit directory={props.directory()} />)
})
```

- [x] **Step 3：保证弹窗可用性**

没有 `platform.getMarsbotAudit` 时显示不可用提示；有目录时自动加载最近 200 条；搜索/过滤改变时重新请求。

### Task 4：文档、验证和发布

**文件：**
- 修改：`docs/marsbotcode-todolist.md`
- 修改：`docs/marsbotcode-task-status.md`
- 修改：`docs/superpowers/plans/2026-06-09-desktop-audit-log-viewer.md`

- [x] **Step 1：更新状态文档**

记录 Desktop Audit Log Viewer MVP 已完成、仍缺少导出/分页/权限审批 UI。

- [ ] **Step 2：运行验证**

运行：

```bash
git diff --check
bun test src/main/marsbot-audit.test.ts
bun test src/main/marsbot-insights.test.ts
bun run typecheck
bun run release:stage -- --stage desktop-audit-viewer
```

- [ ] **Step 3：提交并推送**

提交：

```bash
git add packages/desktop packages/app docs bun.lock
git commit -m "feat: add desktop audit log viewer"
git push marsbotcode codex/runtime-audit
```
