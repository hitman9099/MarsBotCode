# MarsbotCode 阶段发布打包说明

MarsbotCode 的阶段版本需要同时满足三件事：

- 测试验证通过。
- 生成可部署产物。
- 生成可追溯发布清单。

## 命令

```bash
bun run release:stage -- --stage sandbox-runtime
```

默认行为：

- 执行根目录类型检查。
- 执行当前阶段相关的 `packages/opencode` 测试。
- 执行验证门禁时不注入 MarsbotCode 品牌环境变量，避免破坏 `opencode` 兼容性测试。
- 构建当前平台 CLI 二进制。
- 构建当前平台 Desktop。
- 优先打包当前平台 Desktop 安装包；Windows 当前环境无法完成安装器时，自动回退为可部署的 `win-unpacked` zip。
- 在 `dist/marsbotcode-stage/<stage>-<version>-<sha>/` 生成发布目录。

## 产物

Windows 当前会生成：

- `cli/marsbotcode-cli-windows-x64-<version>.zip`
- `desktop/marsbotcode-desktop-windows-x64.exe`，当安装器构建成功时生成。
- `desktop/marsbotcode-desktop-windows-x64-unpacked-<version>.zip`，当当前 Windows 环境无法构建 NSIS 安装器时生成。
- `manifest.json`
- `SHA256SUMS.txt`

CLI zip 内包含：

- `bin/opencode.exe`
- `bin/marsbotcode.cmd`
- `README.md`

`marsbotcode.cmd` 会设置 `MARSBOTCODE=1` 和 `OPENCODE_BRAND=marsbotcode`，再启动打包后的 CLI 二进制。

默认 CLI 包使用当前机器 native 构建。x64 baseline 包需要额外 Bun artifact，当前不作为阶段发布默认门；需要时可追加：

```bash
bun run release:stage -- --stage sandbox-runtime --baseline
```

Desktop 打包会自动把 `ELECTRON_CUSTOM_DIR` 设置为当前 Electron 版本对应的 `v<version>`。如需企业内网镜像，可使用：

```bash
bun run release:stage -- --stage sandbox-runtime --electron-mirror https://your-mirror.example/electron/
```

Windows 上如果 electron-builder 在下载或解压 `winCodeSign` 时失败，脚本会：

- 在 `manifest.json` 写入 `WINDOWS_INSTALLER_FALLBACK` warning。
- 使用 `MARSBOTCODE_SKIP_WIN_SIGN_EDIT=true` 重新生成 `win-unpacked` 目录包。
- 校验 `win-unpacked` 内存在 `.exe` 和 `resources/app.asar` 后再压缩为 zip。

该 zip 是可部署目录包，不是 NSIS 安装器。要生成安装器，需要启用 Windows Developer Mode、使用具备 symlink 权限的会话，或预置 electron-builder 的 `winCodeSign` 缓存。

## manifest

`manifest.json` 会记录：

- 阶段名
- 版本号
- Git 分支与提交
- 平台与架构
- Desktop 打包类型：`installer`、`unpacked` 或 `skipped`
- 验证命令
- fallback warning
- 打包产物路径、大小和 SHA256

## 限制

- 当前脚本默认打包本机平台产物，不做跨平台打包。
- Windows Desktop 安装包首期不做代码签名；在无 symlink 权限环境下会产出 `win-unpacked` zip。
- macOS 签名、公证和企业 MDM 分发仍属于后续 GA 硬化范围。
- Linux deb/rpm/AppImage 可在 Linux 环境用同一脚本扩展验证。
