# MarsbotCode 任务状态记录

## 记录信息

- 记录日期：2026-06-09
- 目标仓库：`https://github.com/hitman9099/MarsBotCode.git`
- 当前阶段：Shell 沙箱运行时 MVP
- 当前状态：已接入 shell 执行链路的 OS 沙箱规划、Linux/macOS 包装命令生成、Windows 弱沙箱提示、shell metadata 和 `sandbox doctor` 真实入口验证
- TodoList：见 `docs/marsbotcode-todolist.md`

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

## 未完成事项

- Desktop 内的审计日志、沙箱状态和权限策略专用面板尚未完成。
- 文件变更摘要的专用审计字段尚未完成，当前通过工具输出 metadata 记录部分摘要。
- OS 模式尚不能执行按域名的网络允许/拒绝规则；当前仅输出明确风险提示。
- Windows 尚无强 OS 隔离，当前为弱沙箱提示模式；强隔离需要后续 WSL、Docker 或微虚拟机方案。
- shell 敏感路径读取和非授权目录写入的专用产品策略仍需继续加强。
- 企业分发所需的签名、公证、内网更新源和安装包验收尚未完成。

## 下一步建议

- 完成 Desktop Beta 工作台里的沙箱状态、审计日志和权限审批可视化。
- 为 edit/write/apply_patch 增加更结构化的文件变更审计摘要。
- 继续增强 shell 权限策略：敏感路径读取拦截、非授权目录写入拦截和更细粒度的网络策略。
