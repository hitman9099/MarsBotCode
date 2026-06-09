#!/usr/bin/env bun

import { createHash } from "node:crypto"
import fs from "node:fs/promises"
import fssync from "node:fs"
import os from "node:os"
import path from "node:path"

type Artifact = {
  name: string
  path: string
  size: number
  sha256: string
}

type Verification = {
  name: string
  command: string[]
  cwd: string
  status: "passed"
}

type ReleaseWarning = {
  code: string
  message: string
  detail?: string
}

type DesktopPackageKind = "skipped" | "installer" | "unpacked"

const root = path.resolve(import.meta.dir, "..")
process.chdir(root)

const args = process.argv.slice(2)
const options = parseArgs(args)
const stage = sanitize(options.stage ?? "manual")
const channel = normalizeChannel(options.channel ?? "beta")
const skipDesktopPackage = options["skip-desktop-package"] === "true"
const skipFullOpencodeTest = options["skip-full-opencode-test"] === "true"
const baselineCli = options.baseline === "true"

const opencodePkg = await Bun.file(path.join(root, "packages/opencode/package.json")).json()
const desktopPkg = await Bun.file(path.join(root, "packages/desktop/package.json")).json()
const electronVersion = String(desktopPkg.devDependencies?.electron ?? desktopPkg.dependencies?.electron ?? "").replace(
  /^[^\d]*/,
  "",
)
const branch = output(["git", "branch", "--show-current"]).trim() || "detached"
const commit = output(["git", "rev-parse", "HEAD"]).trim()
const shortSha = commit.slice(0, 7)
const version = options.version ?? `${opencodePkg.version}-stage.${shortSha}`
const stageID = `${stage}-${version}-${shortSha}`
const releaseDir = path.join(root, "dist", "marsbotcode-stage", stageID)
const electronMirror =
  options["electron-mirror"] ??
  process.env.MARSBOTCODE_ELECTRON_MIRROR ??
  process.env.ELECTRON_MIRROR ??
  "https://github.com/electron/electron/releases/download/"
const electronBuilderBinariesMirror =
  options["electron-builder-binaries-mirror"] ??
  process.env.MARSBOTCODE_ELECTRON_BUILDER_BINARIES_MIRROR ??
  process.env.ELECTRON_BUILDER_BINARIES_MIRROR ??
  "https://npmmirror.com/mirrors/electron-builder-binaries/"
const releaseEnv = {
  MARSBOTCODE: "1",
  OPENCODE_BRAND: "marsbotcode",
  MARSBOTCODE_CHANNEL: channel,
  OPENCODE_CHANNEL: channel,
  OPENCODE_VERSION: version,
  ELECTRON_MIRROR: electronMirror,
  ELECTRON_CUSTOM_DIR: electronVersion ? `v${electronVersion}` : "",
  ELECTRON_BUILDER_BINARIES_MIRROR: electronBuilderBinariesMirror,
  npm_config_electron_builder_binaries_mirror: electronBuilderBinariesMirror,
  CSC_IDENTITY_AUTO_DISCOVERY: "false",
}
const verifications: Verification[] = []
const warnings: ReleaseWarning[] = []
let desktopPackageKind: DesktopPackageKind = skipDesktopPackage ? "skipped" : "installer"

function parseArgs(input: string[]) {
  const result: Record<string, string> = {}
  for (let i = 0; i < input.length; i++) {
    const arg = input[i]
    if (!arg.startsWith("--")) continue
    const raw = arg.slice(2)
    const eq = raw.indexOf("=")
    if (eq >= 0) {
      result[raw.slice(0, eq)] = raw.slice(eq + 1)
      continue
    }
    const next = input[i + 1]
    if (next && !next.startsWith("--")) {
      result[raw] = next
      i++
      continue
    }
    result[raw] = "true"
  }
  return result
}

function normalizeChannel(value: string) {
  if (value === "dev" || value === "beta" || value === "prod") return value
  throw new Error(`Unsupported channel: ${value}`)
}

function sanitize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function platformName() {
  if (process.platform === "win32") return "windows"
  if (process.platform === "darwin") return "darwin"
  return process.platform
}

function output(command: string[]) {
  const proc = Bun.spawnSync(command, {
    cwd: root,
    stdout: "pipe",
    stderr: "pipe",
    env: process.env,
  })
  if (proc.exitCode !== 0) {
    throw new Error(`${command.join(" ")} failed: ${proc.stderr.toString()}`)
  }
  return proc.stdout.toString()
}

class CommandError extends Error {
  constructor(
    public readonly name: string,
    public readonly command: string[],
    public readonly exitCode: number,
  ) {
    super(`${name} failed with exit code ${exitCode}`)
  }
}

async function run(name: string, command: string[], cwd = root, env: Record<string, string> = {}, record = true) {
  console.log(`\n==> ${name}`)
  console.log(`$ ${command.join(" ")}`)
  const executable = command[0] === "bun" ? process.execPath : command[0]
  const proc = Bun.spawn([executable, ...command.slice(1)], {
    cwd,
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
    env: {
      ...process.env,
      ...env,
    },
  })
  const code = await proc.exited
  if (code !== 0) throw new CommandError(name, command, code)
  if (record) verifications.push({ name, command, cwd: path.relative(root, cwd) || ".", status: "passed" })
}

async function sha256(file: string) {
  const hash = createHash("sha256")
  hash.update(await fs.readFile(file))
  return hash.digest("hex")
}

async function addArtifact(file: string): Promise<Artifact> {
  const stat = await fs.stat(file)
  return {
    name: path.basename(file),
    path: path.relative(releaseDir, file).replaceAll("\\", "/"),
    size: stat.size,
    sha256: await sha256(file),
  }
}

async function copyFileWithDirs(from: string, to: string) {
  await fs.mkdir(path.dirname(to), { recursive: true })
  await fs.copyFile(from, to)
}

async function zipDirectory(sourceDir: string, zipPath: string, name = "Zip directory") {
  await fs.mkdir(path.dirname(zipPath), { recursive: true })
  await fs.rm(zipPath, { force: true })

  if (process.platform === "win32") {
    const source = path.join(sourceDir, "*")
    await run(name, [
      "powershell.exe",
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      `Compress-Archive -Path ${psQuote(source)} -DestinationPath ${psQuote(zipPath)} -Force`,
    ])
    return
  }

  await run(name, ["zip", "-r", zipPath, "."], sourceDir)
}

function psQuote(value: string) {
  return `'${value.replaceAll("'", "''")}'`
}

async function findCliBinary() {
  const dist = path.join(root, "packages/opencode/dist")
  const platform = platformName()
  const native = `opencode-${platform}-${process.arch}`
  const baseline = `opencode-${platform}-${process.arch}-baseline`
  const expected = baselineCli ? [baseline, native] : [native, baseline]
  const entries = await fs.readdir(dist, { withFileTypes: true }).catch(() => [])
  for (const name of expected) {
    const entry = entries.find((item) => item.isDirectory() && item.name === name)
    if (!entry) continue
    const binary = path.join(dist, entry.name, "bin", process.platform === "win32" ? "opencode.exe" : "opencode")
    if (fssync.existsSync(binary)) return binary
  }
  throw new Error(`Cannot find current-platform CLI binary in ${dist}`)
}

async function stageCliPackage(artifacts: Artifact[]) {
  const binary = await findCliBinary()
  const platform = platformName()
  const packageName = `marsbotcode-cli-${platform}-${process.arch}-${version}`
  const workDir = path.join(releaseDir, "_work", packageName)
  const binDir = path.join(workDir, "bin")
  const binaryName = process.platform === "win32" ? "opencode.exe" : "opencode"

  await fs.rm(workDir, { recursive: true, force: true })
  await fs.mkdir(binDir, { recursive: true })
  await fs.copyFile(binary, path.join(binDir, binaryName))

  if (process.platform === "win32") {
    await Bun.write(
      path.join(binDir, "marsbotcode.cmd"),
      [
        "@echo off",
        "set MARSBOTCODE=1",
        "set OPENCODE_BRAND=marsbotcode",
        '"%~dp0opencode.exe" %*',
        "",
      ].join("\r\n"),
    )
  } else {
    const wrapper = [
      "#!/usr/bin/env sh",
      "export MARSBOTCODE=1",
      "export OPENCODE_BRAND=marsbotcode",
      'DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"',
      'exec "$DIR/opencode" "$@"',
      "",
    ].join("\n")
    const wrapperPath = path.join(binDir, "marsbotcode")
    await Bun.write(wrapperPath, wrapper)
    await fs.chmod(wrapperPath, 0o755)
  }

  await Bun.write(
    path.join(workDir, "README.md"),
    [
      "# MarsbotCode CLI",
      "",
      `版本：${version}`,
      `提交：${commit}`,
      "",
      "运行方式：",
      "",
      process.platform === "win32" ? "```bat\nbin\\marsbotcode.cmd --version\n```" : "```sh\nbin/marsbotcode --version\n```",
      "",
    ].join("\n"),
  )

  const zipPath = path.join(releaseDir, "cli", `${packageName}.zip`)
  await zipDirectory(workDir, zipPath, "Package CLI zip")
  artifacts.push(await addArtifact(zipPath))
  await fs.rm(path.join(releaseDir, "_work"), { recursive: true, force: true })
}

async function assertWindowsUnpackedArtifact(unpackedDir: string) {
  const entries = await fs.readdir(unpackedDir, { withFileTypes: true }).catch(() => [])
  const hasExe = entries.some((entry) => entry.isFile() && entry.name.endsWith(".exe"))
  const hasAsar = fssync.existsSync(path.join(unpackedDir, "resources", "app.asar"))
  if (!hasExe || !hasAsar) {
    throw new Error(`Incomplete desktop unpacked artifact in ${unpackedDir}`)
  }
}

async function stageDesktopArtifacts(artifacts: Artifact[]) {
  if (skipDesktopPackage) return
  const dist = path.join(root, "packages/desktop/dist")
  const outputDir = path.join(releaseDir, "desktop")
  await fs.mkdir(outputDir, { recursive: true })

  if (desktopPackageKind === "unpacked" && process.platform === "win32") {
    const unpackedDir = path.join(dist, "win-unpacked")
    await assertWindowsUnpackedArtifact(unpackedDir)
    const zipPath = path.join(outputDir, `marsbotcode-desktop-windows-${process.arch}-unpacked-${version}.zip`)
    await zipDirectory(unpackedDir, zipPath, "Package Desktop unpacked zip")
    artifacts.push(await addArtifact(zipPath))
    return
  }

  const entries = await fs.readdir(dist, { withFileTypes: true }).catch(() => [])
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => name.startsWith("marsbotcode-desktop-") || name.startsWith("latest") || name.endsWith(".yml"))

  if (files.length === 0) throw new Error(`Cannot find desktop package artifacts in ${dist}`)

  for (const file of files) {
    const target = path.join(outputDir, file)
    await copyFileWithDirs(path.join(dist, file), target)
    artifacts.push(await addArtifact(target))
  }
}

async function writeManifest(artifacts: Artifact[]) {
  const manifest = {
    product: "MarsbotCode",
    stage,
    channel,
    version,
    createdAt: new Date().toISOString(),
    git: {
      branch,
      commit,
    },
    platform: {
      os: process.platform,
      arch: process.arch,
      hostname: os.hostname(),
    },
    desktop: {
      packageKind: desktopPackageKind,
    },
    verifications,
    warnings,
    artifacts,
  }
  const manifestPath = path.join(releaseDir, "manifest.json")
  await Bun.write(manifestPath, JSON.stringify(manifest, null, 2) + "\n")

  const sums = artifacts.map((artifact) => `${artifact.sha256}  ${artifact.path}`).join("\n") + "\n"
  await Bun.write(path.join(releaseDir, "SHA256SUMS.txt"), sums)
  console.log(`\nMarsbotCode stage release created: ${releaseDir}`)
  console.log(JSON.stringify({ version, artifacts: artifacts.map((item) => item.path) }, null, 2))
}

await fs.rm(releaseDir, { recursive: true, force: true })
await fs.mkdir(releaseDir, { recursive: true })

await run("Typecheck", ["bun", "run", "typecheck"], root)
await run(
  "Stage tests",
  ["bun", "run", "--cwd", "packages/opencode", "test", "test/marsbot/sandbox.test.ts", "test/tool/shell.test.ts"],
  root,
)

if (!skipFullOpencodeTest) {
  await run("Full opencode tests", ["bun", "run", "--cwd", "packages/opencode", "test"], root)
}

const cliBuildCommand = [
  "bun",
  "run",
  "--cwd",
  "packages/opencode",
  "build",
  "--single",
  "--skip-install",
  "--skip-embed-web-ui",
]
if (baselineCli && process.arch === "x64") cliBuildCommand.push("--baseline")
await run("Build CLI", cliBuildCommand, root, releaseEnv)

await run("Build Desktop", ["bun", "run", "--cwd", "packages/desktop", "build"], root, releaseEnv)
if (!skipDesktopPackage) {
  await fs.rm(path.join(root, "packages/desktop/dist"), { recursive: true, force: true })
  const packageScript =
    process.platform === "win32" ? "package:win" : process.platform === "darwin" ? "package:mac" : "package:linux"
  try {
    await run("Package Desktop installer", ["bun", "run", "--cwd", "packages/desktop", packageScript], root, releaseEnv)
  } catch (error) {
    if (process.platform !== "win32") throw error
    const detail = error instanceof Error ? error.message : String(error)
    warnings.push({
      code: "WINDOWS_INSTALLER_FALLBACK",
      message:
        "Windows NSIS installer packaging failed in the current environment. MarsbotCode generated a deployable win-unpacked zip instead.",
      detail:
        `${detail}. Common root cause: electron-builder winCodeSign extraction needs symlink privilege; enable Windows Developer Mode, run with a suitable privilege, or pre-seed the electron-builder cache to produce the installer.`,
    })
    desktopPackageKind = "unpacked"
    await fs.rm(path.join(root, "packages/desktop/dist"), { recursive: true, force: true })
    try {
      await run(
        "Package Desktop unpacked",
        ["bun", "run", "--cwd", "packages/desktop", packageScript, "--dir"],
        root,
        {
          ...releaseEnv,
          MARSBOTCODE_SKIP_WIN_SIGN_EDIT: "true",
        },
      )
    } catch (fallbackError) {
      const fallbackDetail = fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
      await assertWindowsUnpackedArtifact(path.join(root, "packages/desktop/dist", "win-unpacked"))
      warnings.push({
        code: "WINDOWS_UNPACKED_PARTIAL_BUILDER_EXIT",
        message:
          "electron-builder returned a non-zero exit code after creating a complete win-unpacked directory. MarsbotCode packaged that verified directory as the deployable desktop artifact.",
        detail: fallbackDetail,
      })
    }
  }
}

const artifacts: Artifact[] = []
await stageCliPackage(artifacts)
await stageDesktopArtifacts(artifacts)
await writeManifest(artifacts)
