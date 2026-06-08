# MarsbotCode TodoList

## 状态说明

- `[x]`：已完成并已提交到仓库。
- `[ ]`：尚未完成，需要后续开发或验证。
- `阻塞`：当前受环境、依赖或外部条件限制，暂时无法完成。

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
- [ ] Desktop Windows 安装包构建验证。
- [ ] Desktop macOS dmg/zip 构建验证。
- [ ] Desktop Linux AppImage/deb/rpm 构建验证。
- [ ] Desktop 项目选择工作台。
- [ ] Desktop Agent 聊天工作台。
- [ ] Desktop 会话管理工作台。
- [ ] Desktop 文件树工作台。
- [ ] Desktop Diff 查看和接受/撤销建议。
- [ ] Desktop 内置终端展示。
- [ ] Desktop 权限审批 UI。
- [ ] Desktop 沙箱状态面板。
- [ ] Desktop 审计日志面板。
- [ ] Desktop 设置中心。

## 五、沙箱与权限

- [x] 新增 sandbox 默认配置字段。
- [x] 新增 `sandbox doctor` 平台能力检查命令。
- [x] Windows 弱沙箱风险说明已写入文档。
- [ ] Linux bubblewrap shell 包装接入。
- [ ] macOS Seatbelt/sandbox-exec shell 包装接入。
- [ ] Windows WSL 高风险任务执行建议接入产品提示。
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
- [ ] Desktop 审计日志查看面板。
- [ ] 审计日志导出。

## 七、验证与工程化

- [x] `git diff --check` 已通过。
- [x] 核心 JSON 文件解析检查已通过。
- [x] CLI bin、logo、Desktop 图标资源存在性已检查。
- [x] 代码已推送到 `hitman9099/MarsBotCode.git` 的 `main` 分支。
- [ ] 阻塞：当前机器未安装 Bun，无法执行 `bun install`。
- [ ] 阻塞：当前机器未安装 Bun，无法执行 `bun turbo typecheck`。
- [ ] 阻塞：当前机器未安装 Bun，无法执行 `bun test`。
- [ ] 阻塞：当前机器未安装 Bun，无法执行 Desktop build。
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
