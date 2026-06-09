# MarsbotCode 任务状态记录

## 记录信息

- 记录日期：2026-06-09
- 目标仓库：`https://github.com/hitman9099/MarsBotCode.git`
- 当前阶段：Desktop MarsbotCode Insights MVP
- 当前状态：Desktop 状态 popover 已接入 MarsbotCode 沙箱与审计摘要；阶段发布包已生成并完成 smoke test
- TodoList：见 `docs/marsbotcode-todolist.md`

## 本阶段新增记录：Desktop MarsbotCode Insights MVP

- Desktop main 进程新增 `readMarsbotInsights(directory)` 只读模块，可识别 `marsbotcode.jsonc`、`marsbotcode.json`、`.marsbotcode/marsbotcode.jsonc`、`.marsbotcode/marsbotcode.json`。
- MarsbotCode insights 会展示 Windows 弱沙箱提示、Linux bubblewrap 可用性、macOS sandbox-exec 可用性、网络域名规则风险提示和无项目目录兜底状态。
- 审计摘要支持读取配置中的 `audit.path`，按最近 JSONL 记录倒序展示，坏行会被跳过。
- Electron IPC、preload、desktop renderer 和 app platform 已接入 `getMarsbotInsights(directory)`。
- Desktop 状态 popover 新增 `MarsbotCode` 标签页，展示沙箱状态、配置来源、warning、审计启用状态、审计目录和最近 5 条审计记录。
- 本阶段已验证：`bun test src/main/marsbot-insights.test.ts`、`git diff --check`、`bun run typecheck`。
- 阶段发布命令已通过：`bun run release:stage -- --stage desktop-insights`。
- 发布版本：`1.16.2-stage.cc0cd9f`。
- 发布 manifest：`dist/marsbotcode-stage/desktop-insights-1.16.2-stage.cc0cd9f-cc0cd9f/manifest.json`。
- CLI 发布包：`dist/marsbotcode-stage/desktop-insights-1.16.2-stage.cc0cd9f-cc0cd9f/cli/marsbotcode-cli-windows-x64-1.16.2-stage.cc0cd9f.zip`，SHA256 `1e72d5abd2d0516a744cd31075802081a2043a246c720c3a876ae0c12ae3ebd0`。
- Desktop 发布包：`dist/marsbotcode-stage/desktop-insights-1.16.2-stage.cc0cd9f-cc0cd9f/desktop/marsbotcode-desktop-windows-x64-unpacked-1.16.2-stage.cc0cd9f.zip`，SHA256 `7107af5d45a731835a70a24283874e9797cb3a54a43dbf48327cfcb390a0d8fe`。
- 发布包 smoke test 已通过：CLI zip 解压后 `bin\marsbotcode.cmd --version` 输出 `1.16.2-stage.cc0cd9f`；Desktop zip 包含 `MarsbotCode Beta.exe` 和 `resources/app.asar`。
- Windows NSIS installer 在当前环境仍因 symlink 权限问题 fallback 到 `win-unpacked` zip，manifest 已记录 `WINDOWS_INSTALLER_FALLBACK`。
- 当前限制：完整审计日志面板、权限审批 UI、分页/搜索/导出和真实 Electron 截图验收仍需后续阶段补充。

## 已完成事项

- 从 OpenCode `dev` 分支建立 MarsbotCode 代码基座。
- 新增 `marsbotcode` CLI 入口，并保留原 `opencode` 入口。
- 新增 `marsbotcode desktop`、`marsbotcode sandbox doctor`、`marsbotcode audit list` 命令。
- 将 `serve` 增加 `server` 别名，用于 `marsbotcode server`。
- 新增 `marsbotcode.json` 默认配置，覆盖 Desktop、权限、沙箱和审计配置。
- 配置加载支持 `marsbotcode.json/jsonc` 和 `.marsbotcode` 目录。
- 配置 schema 支持 `desktop`、`sandbox`、`audit` 字段。
- Desktop 的 AppId、产品名、协议、窗口标题、打包产物名和自动更新默认策略已切换到 MarsbotCode。
- 接入 Marsbot 品牌 logo，并生成 Desktop icon、dock、ico、icns 资源。
- README、实施说明和项目规划文档已更新为中文。
- 工具调用前、调用后、调用错误已写入 MarsbotCode 审计日志。
- 权限审批请求和审批结果已写入 MarsbotCode 审计日志。
- `marsbotcode audit list` 已支持读取配置中的 `audit.path`。
- Bun `1.3.14` 已安装并验证可用。
- Windows C++ Build Tools 已安装，原生依赖 `tree-sitter-powershell` 可完成编译安装。
- Windows 下因 Git symlink 检出策略导致的 `custom-elements.d.ts` 类型检查阻塞已处理。
- `opencode` 入口下的 `serve` 帮助文案保持 OpenCode 兼容，MarsbotCode 品牌入口仍显示 MarsbotCode。
- 修复 ACP、serve、mcp-add 子进程在 Windows 临时工作目录下找不到 `bun` 的问题。
- 修复 Windows slash-root 路径、Git Bash `/tmp`、`/usr/bin/bash`、Zed DB 路径和外部目录权限归一化问题。
- 修复 EventV2 `/api/event` 输出缺少 `location.project` 的兼容性问题。
- 修复 Git diff 中裸 `\r` 行导致 patch hunk 计数不一致的问题。
- 对当前 Windows 环境无 symlink 创建权限的测试场景增加能力探测和条件跳过。
- 新增 MarsbotCode 沙箱规划模块，统一输出平台能力、包装命令、运行状态和风险提示。
- shell 工具已接入沙箱规划，运行结果 metadata 会记录 `active`、`weak`、`unavailable` 或 `disabled` 状态。
- Linux 已接入 bubblewrap shell 包装规划；macOS 已接入 Seatbelt/sandbox-exec shell 包装规划。
- Windows 已明确进入弱沙箱模式，并在产品输出中提示通过 WSL 或后续 Docker 沙箱执行高风险任务。
- `marsbotcode sandbox doctor` 已复用统一沙箱规划能力，并读取当前项目配置。
- 新增 `bun run release:stage -- --stage sandbox-runtime` 阶段发布脚本。
- 阶段发布脚本会执行类型检查、阶段相关测试、CLI 构建、Desktop 构建、Desktop 打包和发布清单生成。
- Windows Desktop 安装器构建在当前无 symlink 权限环境下会自动回退到 `win-unpacked` zip，并在 `manifest.json` 记录 warning。
- 新增阶段发布打包说明文档：`docs/marsbotcode-release-packaging.md`。

## 已验证事项

- `git diff --check` 已执行，仅出现 Windows 换行提示，无空白错误。
- `package.json`、`packages/opencode/package.json`、`packages/desktop/package.json`、`marsbotcode.json` 已完成 JSON 解析检查。
- CLI bin、品牌 logo、Desktop 图标资源已确认存在。
- `bun install` 已执行通过，并生成当前 `bun.lock`。
- `bun run typecheck` 已执行通过。
- `bun --cwd packages/desktop build` 已执行通过。
- `bun test test/config/config.test.ts -t "creates global jsonc config with schema when no global configs exist"` 已执行通过。
- `bun test test/cli/help/help-snapshots.test.ts -t "every documented command emits stable help text"` 已执行通过。
- `bun test test/shell/shell.test.ts test/tool/shell.test.ts` 已执行通过：`75 pass / 0 fail`。
- `bun --cwd packages/opencode test` 已执行通过：`2963 pass / 58 skip / 1 todo / 0 fail`。
- `bun test test/marsbot/sandbox.test.ts test/tool/shell.test.ts` 已执行通过：`72 pass / 0 fail`。
- `bun --conditions=browser ./src/index.ts sandbox doctor` 已执行通过，并正确展示 Windows 弱沙箱、启用配置和网络域名限制提示。
- `bun run release:stage -- --stage sandbox-runtime` 已执行通过，包含 `bun run typecheck`、阶段相关测试、`packages/opencode` 全量测试、CLI 构建、Desktop 构建和发布包生成。
- `packages/opencode` 全量测试已通过：`2963 pass / 58 skip / 1 todo / 0 fail`。
- 阶段发布已生成 CLI zip、Desktop `win-unpacked` zip、`manifest.json` 和 `SHA256SUMS.txt`。
- Desktop `win-unpacked` fallback 已校验存在 `.exe` 和 `resources/app.asar` 后再进入发布包。
- CLI zip 已完成 smoke test：解压后运行 `bin\marsbotcode.cmd --version` 可输出阶段版本号。

## 未完成事项

- Desktop 内的审计日志、沙箱状态和权限策略专用面板尚未完成。
- 文件变更摘要的专用审计字段尚未完成，当前通过工具输出 metadata 记录部分摘要。
- OS 模式尚不能执行按域名的网络允许/拒绝规则；当前仅输出明确风险提示。
- Windows 尚无强 OS 隔离，当前为弱沙箱提示模式；强隔离需要后续 WSL、Docker 或微虚拟机方案。
- shell 敏感路径读取和非授权目录写入的专用产品策略仍需继续加强。
- 当前 Windows 会话缺少 symlink 权限，NSIS installer 会在 electron-builder `winCodeSign` 解压阶段失败；本阶段已回退为可部署目录包，安装器需要后续在具备权限的环境中验收。
- 企业分发所需的签名、公证、内网更新源和安装器验收尚未完成。

## 下一步建议

- 在具备 Windows symlink 权限或预置 `winCodeSign` 缓存的环境中补充 NSIS installer 验收。
- 完成 Desktop Beta 工作台里的沙箱状态、审计日志和权限审批可视化。
- 进入下一个阶段：Desktop Beta 工作台的项目选择、会话管理、审计日志和沙箱状态可视化。
