# MarsbotCode 实施说明

## 已实现范围

本轮实现的是 MarsbotCode 的可运行基础层，而不是完整 8 周 MVP 的全部功能。

已落地内容：

- 从 OpenCode `dev` 分支建立 MarsbotCode Fork 基座。
- 新增 `marsbotcode` CLI bin，并保持原 `opencode` bin 可用。
- CLI 显示名在 MarsbotCode 入口下切换为 `marsbotcode`。
- 新增 `desktop`、`sandbox doctor`、`audit list` 命令。
- `serve` 增加 `server` 别名。
- 全局数据目录从 `opencode` 改为 `marsbotcode`。
- 配置加载支持 `marsbotcode.json/jsonc` 和 `.marsbotcode`。
- 配置 schema 支持 `desktop`、`sandbox`、`audit` 字段。
- Desktop 的 AppId、产品名、协议、窗口标题、打包产物名和图标改为 MarsbotCode。
- 自动更新默认关闭，仅当 `MARSBOTCODE_ENABLE_AUTOUPDATE=1` 时启用。
- Logo 源图保存在 `docs/assets/marsbot-logo.png`，桌面图标资源保存在 `packages/desktop/resources/icons`。

## 尚未完成的深接入

以下功能已经有配置和命令基础，但还没有完成运行时强制接入：

- shell 工具的 OS 级沙箱包装。
- 工具调用前后的自动审计写入。
- Desktop 内的专用审计面板、沙箱状态面板和权限策略面板。
- IDE 插件最小入口。
- 企业内部分发、签名、公证和自动更新源。

## 后续接入建议

沙箱应接入两个位置之一：

- `packages/opencode/src/session/tools.ts`：可统一处理所有工具调用前后事件，适合审计。
- `packages/opencode/src/tool/shell.ts`：可只包装 shell 命令，适合 OS 级沙箱。

审计建议接入 `tool.execute.before` 和 `tool.execute.after` 附近，记录：

- 时间
- sessionID
- messageID
- callID
- tool
- args 摘要
- output 摘要
- 权限决策
- 是否沙箱执行

Windows 首期应继续展示弱沙箱提示，并推荐通过 WSL 执行高风险任务。
