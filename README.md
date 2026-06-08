# MarsbotCode

![Marsbot Logo](docs/assets/marsbot-logo.png)

MarsbotCode 是基于 [OpenCode](https://github.com/anomalyco/opencode) Fork 改造的企业私有化 AI Coding Agent。当前仓库保留 OpenCode 的 Agent、CLI/TUI、Desktop、Server、Provider、Tool、Permission 和插件主干能力，并新增 MarsbotCode 的品牌入口、桌面客户端元数据、默认配置、沙箱体检和审计查看命令。

## 当前已落地

- 新增 `marsbotcode` CLI 入口，兼容原 `opencode` 运行时。
- `marsbotcode run "<任务>"` 复用 OpenCode Agent 执行一次性任务。
- `marsbotcode server` 作为 `serve` 的别名启动本地 Agent Server。
- `marsbotcode desktop` 通过 `marsbotcode://open` 唤起桌面客户端。
- `marsbotcode sandbox doctor` 检查 Linux/macOS/Windows 当前 OS 级沙箱能力。
- `marsbotcode audit list` 查看 `.marsbot/audit/*.jsonl` 审计日志。
- Desktop 打包名、AppId、协议、窗口标题和图标已改为 MarsbotCode。
- 配置系统支持 `marsbotcode.json/jsonc`、`.marsbotcode` 目录，以及 `desktop`、`sandbox`、`audit` 配置字段。

## 快速开始

> 当前项目仍依赖 OpenCode 原有 Bun monorepo 工具链。请先安装 Bun。

```bash
bun install

# CLI/TUI
bun run --cwd packages/opencode --conditions=browser src/index.ts

# Desktop 开发模式
bun --cwd packages/desktop dev
```

如果通过构建产物安装，目标命令为：

```bash
marsbotcode
marsbotcode run "分析这个项目的技术栈"
marsbotcode server
marsbotcode desktop
marsbotcode sandbox doctor
marsbotcode audit list
```

## 默认配置

仓库根目录提供 `marsbotcode.json`，用于企业私有化 MVP 的默认策略：

- 桌面端默认启用，但关闭公网自动更新。
- OS 级沙箱默认启用配置项，但当前深度 shell 包装仍需继续接入。
- 审计日志默认写入 `.marsbot/audit`。
- 关键权限默认偏向 `ask`，敏感路径通过 sandbox 配置声明。

## 重要安全说明

MarsbotCode 目前仍以 OpenCode 原生权限系统为主。`sandbox doctor` 已提供平台能力检测，但 OS 级沙箱对 shell 工具的强制包装还需要继续接入 `packages/opencode/src/session/tools.ts` 或 `packages/opencode/src/tool/shell.ts` 执行管线。

因此当前版本不能宣称具备 Docker/VM 级强隔离。企业高安全场景应在后续版本加入 Docker 或微虚拟机沙箱。

## 项目文档

- [MarsbotCode 实施说明](docs/marsbotcode-implementation.md)
- [MarsbotCode 项目规划](docs/marsbotcode-plan.md)

## 上游说明

MarsbotCode 基于 OpenCode `dev` 分支改造。为了降低维护成本，本仓库保留大量 `@opencode-ai/*` 内部包名和环境变量，优先改造用户可见入口、品牌资源和企业增强层。
