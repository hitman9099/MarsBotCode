# MarsbotCode 阶段发布打包 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 MarsbotCode 增加可复用的阶段发布脚本，每个阶段都能完成测试验证、CLI 打包、Desktop 打包和发布清单生成。

**Architecture:** 根目录脚本负责编排验证与打包，不重写 OpenCode 既有 build/electron-builder 逻辑。脚本生成本机平台产物和 `manifest.json`，文档记录命令、产物位置和限制。

**Tech Stack:** Bun、TypeScript、electron-builder、MarsbotCode/OpenCode monorepo scripts。

---

### Task 1: 阶段发布脚本

**Files:**
- Create: `script/marsbot-stage-release.ts`
- Modify: `package.json`

- [x] **Step 1: 新增脚本**

实现 `script/marsbot-stage-release.ts`，按顺序执行：

```bash
bun run typecheck
bun --cwd packages/opencode test test/marsbot/sandbox.test.ts test/tool/shell.test.ts
bun --cwd packages/opencode run build --single --skip-install --skip-embed-web-ui
bun --cwd packages/desktop build
bun --cwd packages/desktop package:win
```

脚本需要生成根目录 `dist/marsbotcode-stage/<stage-id>/manifest.json`，并复制 CLI zip 与 Desktop 安装包。

当前 Windows 会话缺少 symlink 权限时，`package:win` 的 NSIS installer 会在 `winCodeSign` 解压阶段失败；脚本已实现 fallback，改为生成验证过的 Desktop `win-unpacked` zip。

- [x] **Step 2: 注册 npm script**

在根 `package.json` 增加：

```json
"release:stage": "bun script/marsbot-stage-release.ts"
```

### Task 2: Desktop 打包元信息品牌化

**Files:**
- Modify: `packages/desktop/scripts/copy-metainfo.ts`

- [x] **Step 1: 替换 OpenCode 元信息**

将 app id、产品名、开发者、描述和 URL 切换为 MarsbotCode，确保 Linux AppImage/deb/rpm 元信息不再指向 OpenCode 上游。

### Task 3: 文档与验证

**Files:**
- Create: `docs/marsbotcode-release-packaging.md`
- Modify: `docs/marsbotcode-todolist.md`
- Modify: `docs/marsbotcode-task-status.md`

- [x] **Step 1: 写发布说明**

记录阶段发布命令、产物目录、manifest 字段、Windows/macOS/Linux 限制。

- [x] **Step 2: 跑完整阶段发布**

运行：

```bash
bun run release:stage -- --stage sandbox-runtime
```

预期产出：

```text
dist/marsbotcode-stage/sandbox-runtime-<version>-<sha>/
```

目录内包含 CLI zip、Desktop installer、manifest 和 checksum。

- [x] **Step 3: 提交并推送**

```bash
git add package.json script/marsbot-stage-release.ts packages/desktop/scripts/copy-metainfo.ts docs
git commit -m "build: add MarsbotCode stage release packaging"
git push marsbotcode codex/runtime-audit
```
