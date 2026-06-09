# MarsbotCode 任务状态记录

## 记录信息

- 记录日期：2026-06-09
- 目标仓库：`https://github.com/hitman9099/MarsBotCode.git`
- 当前阶段：阻塞项解除与本地验证
- 当前状态：Bun、Windows C++ Build Tools、依赖安装、类型检查、Desktop build 和 `packages/opencode` Windows 全量测试阻塞均已解除
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
- `bun --cwd packages/opencode test` 已执行通过：`2956 pass / 58 skip / 1 todo / 0 fail`。

## 未完成事项

- shell 工具的 OS 级沙箱强制包装尚未接入运行时。
- Desktop 内的审计日志、沙箱状态和权限策略专用面板尚未完成。
- 文件变更摘要的专用审计字段尚未完成，当前通过工具输出 metadata 记录部分摘要。
- 企业分发所需的签名、公证、内网更新源和安装包验收尚未完成。

## 下一步建议

- 进入下一阶段：在 `packages/opencode/src/tool/shell.ts` 或 shell 执行管线接入 OS 沙箱包装。
- 完成 Desktop Beta 工作台里的沙箱状态、审计日志和权限审批可视化。
- 为 edit/write/apply_patch 增加更结构化的文件变更审计摘要。
