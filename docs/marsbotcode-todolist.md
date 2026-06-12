# MarsbotCode TodoList

## 状态说明

- `[x]`：已完成并已提交到仓库。
- `[ ]`：尚未完成，需要后续开发或验证。
- `阻塞`：当前受环境、依赖或外部条件限制，暂时无法完成。

## 本阶段：Desktop 演示首屏空态优化（2026-06-12）

- [x] Home 无项目、无搜索、非加载状态下展示 MarsbotCode 私有化 AI Coding 工作台演示面板。
- [x] 左侧项目栏无项目时补齐快捷入口、添加本地仓库卡片和运行状态，减少空白并贴近 Codex 侧栏信息密度。
- [x] 新增 `shouldShowMarsbotHomeEmptyState(input)` 和 `shouldShowMarsbotProjectSidebarEmptyState(input)` 纯逻辑测试。
- [x] `bun test src/pages/home-empty-state.test.ts` 已通过：3 pass / 0 fail。
- [x] `bun run typecheck` 已通过。
- [x] `git diff --check` 已通过，仅有 Windows 换行提示。
- [x] `bun run --cwd packages/desktop build` 已通过。
- [x] `$env:MARSBOTCODE_SKIP_WIN_SIGN_EDIT='true'; bun run --cwd packages/desktop package:win --dir` 已通过，生成可演示 `win-unpacked` 目录包。
- [x] `packages/desktop/dist/win-unpacked/MarsbotCode Dev.exe` 已重新启动，主窗口标题为 `MarsbotCode`。
- [x] `app.asar` 已验证包含左侧新增文案：`新建工作区`、`添加本地仓库`、`运行状态`、`Windows 弱隔离`。
- [ ] Computer Use 截图验收暂未完成，当前环境报 `@oai/sky` package exports 不匹配；本次以包内容和进程启动验证兜底。
- [ ] 该演示修复尚未生成独立安装器/zip 发布包，当前可部署形态为未签名 `win-unpacked` 目录包。

## 本阶段：Desktop 权限审批中心 MVP（2026-06-11）

- [x] 新增 `buildMarsbotPermissionSummary(input)` 纯逻辑模块，按权限请求聚合 `permission.request/granted/rejected` 审计记录。
- [x] 新增 `MarsbotCode Permissions` 桌面弹窗，展示 Requests、Granted、Rejected、Pending 统计。
- [x] 权限中心支持 All/Pending/Granted/Rejected 筛选、本地搜索、刷新和打开审计目录。
- [x] MarsbotCode 状态 popover 新增 `Permissions` 入口。
- [x] MarsbotCode Workbench 新增 `Permissions` 入口。
- [x] `bun test src/components/marsbot-permission-summary.test.ts` 已通过：3 pass / 0 fail。
- [x] `git diff --check` 已通过，仅有 Windows 换行提示。
- [x] `bun run typecheck` 已通过。
- [x] `bun run release:stage -- --stage desktop-permission-center` 已通过，生成 `1.16.2-stage.094cd4c` 阶段发布包。
- [x] CLI 发布包 smoke test 已通过：`bin\marsbotcode.cmd --version` 输出 `1.16.2-stage.094cd4c`。
- [x] Desktop Windows 可部署 zip 已验证包含 `MarsbotCode Beta.exe` 和 `resources/app.asar`。
- [ ] 实时全局权限审批队列和 allow/deny 弹窗仍未完成；当前 MVP 为审计型只读权限中心。
- [ ] 权限规则编辑、团队默认策略和权限决策导出仍未完成。

## 本阶段：Desktop 工作台总览 MVP（2026-06-10）

- [x] 新增 `buildMarsbotWorkbenchSummary(input)` 纯逻辑模块，聚合项目、会话、文件树、终端、沙箱和审计状态。
- [x] 新增 `MarsbotCode Workbench` 弹窗，展示项目摘要、指标、模块状态和最近会话。
- [x] MarsbotCode 状态 popover 新增 `Workbench` 入口。
- [x] 工作台总览支持跳转 Home、新建会话、打开最近会话、打开文件树、切换终端和打开审计日志。
- [x] `bun test src/components/marsbot-workbench-summary.test.ts` 已通过：2 pass / 0 fail。
- [x] `git diff --check` 已通过，仅有 Windows 换行提示。
- [x] `bun run typecheck` 已通过。
- [x] `bun run release:stage -- --stage desktop-workbench-overview` 已通过，生成 `1.16.2-stage.c90f56b` 阶段发布包。
- [x] CLI 发布包 smoke test 已通过：`bin\marsbotcode.cmd --version` 输出 `1.16.2-stage.c90f56b`。
- [x] Desktop Windows 可部署 zip 已验证包含 `MarsbotCode Beta.exe` 和 `resources/app.asar`。
- [ ] 完整 Agent 聊天工作台仍未完成。
- [ ] Diff 接受/撤销建议仍未完成。
- [ ] Desktop 实时权限审批 UI 仍未完成。

## 本阶段：Desktop MarsbotCode Insights MVP（2026-06-09）

- [x] Desktop main 进程新增 MarsbotCode insights 只读模块，可读取项目 `marsbotcode.json/jsonc`、`.marsbotcode` 配置和 `.marsbot/audit` JSONL。
- [x] MarsbotCode insights 已覆盖 Windows 弱沙箱、Linux bubblewrap、macOS sandbox-exec、无项目目录、JSONC 配置优先级和最近审计记录读取。
- [x] Electron IPC、preload、desktop renderer 和 app platform 已接入 `getMarsbotInsights(directory)`。
- [x] Desktop 状态 popover 新增 `MarsbotCode` 标签页，展示当前项目沙箱状态、平台引擎、配置来源、warning、审计路径和最近审计记录。
- [x] MarsbotCode 标签页支持刷新状态和打开审计目录。
- [x] `bun test src/main/marsbot-insights.test.ts` 已通过：3 pass / 0 fail。
- [x] `git diff --check` 已通过，仅有 Windows 换行提示。
- [x] `bun run typecheck` 已通过。
- [x] `bun run release:stage -- --stage desktop-insights` 已通过，生成 `1.16.2-stage.cc0cd9f` 阶段发布包。
- [x] CLI 发布包 smoke test 已通过：`bin\marsbotcode.cmd --version` 输出 `1.16.2-stage.cc0cd9f`。
- [x] Desktop Windows 可部署 zip 已验证包含 `MarsbotCode Beta.exe` 和 `resources/app.asar`。
- [ ] 完整 Desktop 审计日志面板、分页、搜索和导出仍未完成。
- [x] Desktop 权限审批中心 MVP 已完成。
- [ ] Desktop 实时权限审批 UI 仍未完成。
- [ ] Desktop 沙箱/审计面板的真实 Electron 截图验收仍需在后续桌面试点环境补充。

## 本阶段：Desktop 审计日志查看器 MVP（2026-06-09）

- [x] Desktop main 进程新增 `readMarsbotAudit(directory, options)` 只读模块。
- [x] 审计日志读取支持 `audit.path`、JSONC 配置、坏 JSONL 行计数、`query` 搜索、`type` 过滤、`tool` 过滤和 `limit`。
- [x] 新增 `getMarsbotAudit(directory, options)` Electron IPC、preload、desktop renderer 和 app platform 可选方法。
- [x] Desktop 新增 `MarsbotCode Audit` 弹窗，支持搜索、类型过滤、刷新、打开审计目录、统计摘要和记录列表。
- [x] MarsbotCode 状态 popover 新增 `View audit log` 入口。
- [x] `bun test src/main/marsbot-audit.test.ts` 已通过：3 pass / 0 fail。
- [x] `bun test src/main/marsbot-insights.test.ts` 已通过：3 pass / 0 fail。
- [x] `bun run typecheck` 已通过。
- [x] `bun run release:stage -- --stage desktop-audit-viewer` 已通过，生成 `1.16.2-stage.3d80d4d` 阶段发布包。
- [x] CLI 发布包 smoke test 已通过：`bin\marsbotcode.cmd --version` 输出 `1.16.2-stage.3d80d4d`。
- [x] Desktop Windows 可部署 zip 已验证包含 `MarsbotCode Beta.exe` 和 `resources/app.asar`。
- [ ] 审计日志导出仍未完成。
- [ ] 审计日志分页/虚拟滚动仍未完成，当前 MVP 最多读取 200 条。
- [x] Desktop 权限审批中心 MVP 已完成。
- [ ] Desktop 实时权限审批 UI 仍未完成。

## 一、基础代码与品牌化

- [x] 从 OpenCode `dev` 分支建立 MarsbotCode 代码基座。
- [x] 根项目 `package.json` 改为 MarsbotCode 项目描述。
- [x] 新增 MarsbotCode 中文 README。
- [x] 接入 Marsbot 品牌 logo。
- [x] 生成 Desktop 所需 `png`、`ico`、`icns` 图标资源。
- [x] 新增 MarsbotCode 实施说明文档。
- [x] 新增 MarsbotCode 项目规划文档。
- [x] 新增 MarsbotCode 任务状态记录文档。

## 二、CLI/TUI

- [x] 新增 `marsbotcode` CLI bin。
- [x] 保留原 `opencode` CLI bin，便于后续同步上游。
- [x] MarsbotCode 入口下 CLI 显示名切换为 `marsbotcode`。
- [x] `serve` 增加 `server` 别名。
- [x] 新增 `marsbotcode desktop` 命令。
- [x] 新增 `marsbotcode sandbox doctor` 命令。
- [x] 新增 `marsbotcode audit list` 命令。
- [ ] 完整验证 `marsbotcode` 构建产物安装后的全局命令。
- [ ] 完整验证 CLI/TUI 一次性任务执行、交互会话和文件修改流程。

## 三、配置系统

- [x] 新增根目录 `marsbotcode.json` 默认配置。
- [x] 配置加载支持 `marsbotcode.json` 和 `marsbotcode.jsonc`。
- [x] 配置路径支持 `.marsbotcode` 目录。
- [x] 配置 schema 支持 `desktop` 字段。
- [x] 配置 schema 支持 `sandbox` 字段。
- [x] 配置 schema 支持 `audit` 字段。
- [x] 全局数据目录从 `opencode` 切换为 `marsbotcode`。
- [ ] 配置 schema 生成文档和 OpenCode 原文档的 MarsbotCode 化。
- [ ] 企业团队级默认配置模板。

## 四、Desktop 客户端

- [x] Desktop 包名切换为 `@marsbotcode/desktop`。
- [x] Desktop AppId 切换为 MarsbotCode。
- [x] Desktop productName 切换为 MarsbotCode。
- [x] Desktop 协议切换为 `marsbotcode://`。
- [x] Desktop 窗口标题切换为 MarsbotCode。
- [x] Desktop 打包产物名切换为 `marsbotcode-desktop-*`。
- [x] Desktop 自动更新默认关闭。
- [x] Desktop 关键英文文案和部分中文文案改为 MarsbotCode。
- [ ] Desktop 开发模式启动验证。
- [x] Desktop Windows 可部署 `win-unpacked` zip 构建验证。
- [ ] Desktop Windows NSIS 安装包构建验证（当前 Windows 会话缺少 symlink 权限，已回退为可部署目录包）。
- [ ] Desktop macOS dmg/zip 构建验证。
- [ ] Desktop Linux AppImage/deb/rpm 构建验证。
- [x] Desktop 工作台总览入口。
- [x] Desktop 项目选择入口已复用 Home/Open Project。
- [ ] Desktop Agent 聊天工作台。
- [x] Desktop 会话管理入口已接入工作台总览和 Home 最近会话。
- [x] Desktop 文件树入口已接入工作台总览。
- [ ] Desktop Diff 查看和接受/撤销建议。
- [x] Desktop 内置终端入口已接入工作台总览。
- [x] Desktop 权限审批中心 MVP（审计型只读视图）。
- [ ] Desktop 实时权限审批 UI（全局 pending 队列、allow/deny 弹窗）。
- [ ] Desktop 沙箱状态面板。
- [x] Desktop 审计日志查看器 MVP。
- [ ] Desktop 设置中心。

## 五、沙箱与权限

- [x] 新增 sandbox 默认配置字段。
- [x] 新增 `sandbox doctor` 平台能力检查命令。
- [x] Windows 弱沙箱风险说明已写入文档。
- [x] Linux bubblewrap shell 包装接入。
- [x] macOS Seatbelt/sandbox-exec shell 包装接入。
- [x] Windows WSL 高风险任务执行建议接入产品提示。
- [ ] shell 工具敏感路径读取拦截。
- [ ] shell 工具非授权目录写入拦截。
- [ ] 网络访问域名允许/拒绝规则接入运行时。
- [ ] Docker 沙箱模式。
- [ ] 微虚拟机沙箱模式。

## 六、审计

- [x] 新增 audit 默认配置字段。
- [x] 新增 `marsbotcode audit list` 日志查看命令。
- [x] `marsbotcode audit list` 支持读取配置中的 `audit.path`。
- [x] 任务状态文档记录当前验证限制。
- [x] 工具调用前自动写入审计日志。
- [x] 工具调用后自动写入审计日志。
- [x] 工具调用错误自动写入审计日志。
- [x] 权限审批请求和结果写入审计日志。
- [x] shell 命令和输出摘要写入审计日志。
- [ ] 文件变更摘要写入审计日志。
- [x] Desktop 审计日志查看器 MVP。
- [ ] 审计日志导出。

## 七、验证与工程化

- [x] `git diff --check` 已通过。
- [x] 核心 JSON 文件解析检查已通过。
- [x] CLI bin、logo、Desktop 图标资源存在性已检查。
- [x] 代码已推送到 `hitman9099/MarsBotCode.git` 的 `codex/runtime-audit` 分支。
- [x] Bun `1.3.14` 已安装并验证可用。
- [x] Windows C++ Build Tools 已安装，`tree-sitter-powershell` 原生依赖可完成安装。
- [x] `bun install` 已执行通过，并更新 `bun.lock`。
- [x] `bun run typecheck` 已执行通过。
- [x] Desktop build 已执行通过。
- [x] `bun --cwd packages/opencode test` 已在 Windows 环境通过：`2963 pass / 58 skip / 1 todo / 0 fail`。
- [x] Shell 沙箱运行时 MVP 已验证：沙箱规划、shell metadata 和 `sandbox doctor` 入口均可用。
- [x] 新增阶段发布脚本 `bun run release:stage -- --stage sandbox-runtime`。
- [x] 完整阶段发布命令已通过，包含全量 `packages/opencode` 测试和本机发布包生成。
- [x] 阶段发布 manifest、SHA256SUMS、CLI zip 和 Desktop Windows 可部署 zip 已生成。
- [x] Windows Desktop installer 失败时可自动回退到 `win-unpacked` zip，并在 manifest 记录 warning。
- [ ] CI 流程切换为 MarsbotCode 私有化仓库策略。
- [ ] 移除或调整仍指向 OpenCode 上游发布仓库的自动化流程。

## 八、后续版本

- [ ] VS Code 插件最小入口。
- [ ] 企业内网更新源。
- [ ] 客户端签名、公证和企业 MDM 分发。
- [ ] 模型网关。
- [ ] RBAC 和组织策略。
- [ ] GitHub/GitLab PR 自动修复。
- [ ] 远程工作区执行。
- [ ] Web 工作台。
- [ ] 企业知识库/RAG 接入。
