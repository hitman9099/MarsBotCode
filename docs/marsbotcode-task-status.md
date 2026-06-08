# MarsbotCode 任务状态记录

## 记录信息

- 记录日期：2026-06-08
- 目标仓库：`https://github.com/hitman9099/MarsBotCode.git`
- 当前阶段：审计运行时接入
- 当前状态：工具调用和权限审批审计写入已接入，等待完整依赖环境下的构建、类型检查和端到端验证
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

## 已验证事项

- `git diff --check` 已执行，仅出现 Windows 换行提示，无空白错误。
- `package.json`、`packages/opencode/package.json`、`packages/desktop/package.json`、`marsbotcode.json` 已完成 JSON 解析检查。
- CLI bin、品牌 logo、Desktop 图标资源已确认存在。

## 未完成事项

- 当前机器未安装 Bun，无法运行 `bun install`、`bun turbo typecheck`、`bun test` 或 Desktop build。
- shell 工具的 OS 级沙箱强制包装尚未接入运行时。
- Desktop 内的审计日志、沙箱状态和权限策略专用面板尚未完成。
- 文件变更摘要的专用审计字段尚未完成，当前通过工具输出 metadata 记录部分摘要。
- 企业分发所需的签名、公证、内网更新源和安装包验收尚未完成。

## 下一步建议

- 安装 Bun `1.3.14` 后执行依赖安装和类型检查。
- 在 `packages/opencode/src/tool/shell.ts` 或 shell 执行管线接入 OS 沙箱包装。
- 完成 Desktop Beta 工作台里的沙箱状态、审计日志和权限审批可视化。
- 为 edit/write/apply_patch 增加更结构化的文件变更审计摘要。
