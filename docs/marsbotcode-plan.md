# MarsbotCode 项目规划

## 产品定位

MarsbotCode 是面向企业私有化部署的 AI Coding Agent，基于 OpenCode Fork 改造，形成 CLI/TUI 与全平台桌面客户端双主入口。

## MVP 目标

- CLI/TUI 完整可用。
- Desktop 提供 Beta 级完整工作台。
- 支持项目选择、Agent 聊天、会话管理、文件树、Diff、终端、权限审批、沙箱状态、审计日志和设置中心。
- 支持 Windows、macOS、Linux。
- 沿用 OpenCode 原生 Provider 配置。
- 通过 OS 级沙箱降低 shell 执行风险。

## 8 周路线

| 周期 | 目标 | 交付物 |
|---|---|---|
| 第 1 周 | Fork、品牌化、构建跑通 | `marsbotcode` CLI、Desktop 包名、图标、配置目录 |
| 第 2 周 | Core/CLI/TUI 可用 | Agent 会话、代码修改、命令执行、Provider 配置 |
| 第 3 周 | Desktop 基础壳 | Electron 启动、本地 server 连接、项目选择、会话列表 |
| 第 4 周 | Desktop 工作台 | 聊天、文件树、Diff、终端输出、模型选择 |
| 第 5 周 | 权限与沙箱 | 权限审批 UI、OS 沙箱包装、sandbox doctor、平台风险提示 |
| 第 6 周 | 审计与设置 | 审计日志面板、配置中心、规则管理、Provider 管理 |
| 第 7 周 | 全平台打包 | Windows installer、macOS dmg/zip、Linux AppImage/deb/rpm |
| 第 8 周 | Beta 验收 | 端到端测试、试点部署、用户文档、风险清单 |

## 风险

- OS 级沙箱不是强隔离，不能替代 Docker/VM。
- Windows 原生沙箱能力较弱，需要 WSL 或容器方案兜底。
- Fork OpenCode 后需要持续维护上游同步策略。
- 全平台 Desktop 打包涉及签名、公证和企业分发流程，GA 前需要单独硬化。
