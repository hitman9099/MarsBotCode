import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { FSUtil } from "@opencode-ai/core/fs-util"

export type SandboxConfig = {
  enabled?: boolean
  mode?: "os" | "off"
  denyRead?: string[]
  allowRead?: string[]
  allowWrite?: string[]
  denyWrite?: string[]
  allowedDomains?: string[]
  deniedDomains?: string[]
}

export type SandboxStatus = {
  enabled: boolean
  mode: "os" | "off"
  platform: NodeJS.Platform
  status: "disabled" | "active" | "weak" | "unavailable"
  engine: "bubblewrap" | "seatbelt" | "none"
  wrapped: boolean
  message: string
  warnings: string[]
}

export type SandboxPlan = {
  status: SandboxStatus
  command?: string
  args?: string[]
}

type CapabilityInput = {
  platform?: NodeJS.Platform
  exists?: (command: string, args?: string[]) => boolean
}

type PlanInput = CapabilityInput & {
  config?: SandboxConfig
  shell: string
  shellArgs: string[]
  cwd: string
  home?: string
  stat?: (file: string) => "dir" | "file" | undefined
}

function commandExists(command: string, args: string[] = ["--version"]) {
  const result = spawnSync(command, args, { encoding: "utf8", windowsHide: true })
  return !result.error && result.status !== null
}

function defaultStat(file: string) {
  try {
    const stat = fs.statSync(file)
    if (stat.isDirectory()) return "dir"
    if (stat.isFile()) return "file"
  } catch {
    return undefined
  }
}

function expandPath(input: string, cwd: string, platform: NodeJS.Platform, home: string) {
  const expanded =
    input === "~" ? home : input.startsWith("~/") || input.startsWith("~\\") ? path.join(home, input.slice(2)) : input
  if (platform === "win32") return FSUtil.normalizePath(path.resolve(cwd, FSUtil.windowsPath(expanded)))
  const normalized = expanded.replaceAll("\\", "/")
  return path.posix.isAbsolute(normalized) ? path.posix.normalize(normalized) : path.posix.resolve(cwd, normalized)
}

function unique(list: string[]) {
  return [...new Set(list.filter(Boolean))]
}

function paths(input: string[] | undefined, cwd: string, platform: NodeJS.Platform, home: string) {
  return unique((input ?? []).map((item) => expandPath(item, cwd, platform, home)))
}

export function capability(input: CapabilityInput = {}) {
  const platform = input.platform ?? process.platform
  const exists = input.exists ?? commandExists

  if (platform === "linux") {
    return {
      platform,
      engine: "bubblewrap" as const,
      available: exists("bwrap"),
      detail: exists("bwrap") ? "available: bubblewrap" : "missing: install bubblewrap",
    }
  }

  if (platform === "darwin") {
    return {
      platform,
      engine: "seatbelt" as const,
      available: exists("sandbox-exec", ["-h"]),
      detail: exists("sandbox-exec", ["-h"]) ? "available: Seatbelt/sandbox-exec" : "missing: sandbox-exec",
    }
  }

  if (platform === "win32") {
    return {
      platform,
      engine: "none" as const,
      available: false,
      detail: "weak mode: native OS sandbox is not enabled",
    }
  }

  return {
    platform,
    engine: "none" as const,
    available: false,
    detail: "unsupported platform",
  }
}

function baseStatus(input: {
  config?: SandboxConfig
  platform: NodeJS.Platform
  engine: SandboxStatus["engine"]
  status: SandboxStatus["status"]
  wrapped: boolean
  message: string
  warnings?: string[]
}): SandboxStatus {
  const mode = input.config?.mode ?? "os"
  return {
    enabled: input.config?.enabled === true && mode !== "off",
    mode,
    platform: input.platform,
    engine: input.engine,
    status: input.status,
    wrapped: input.wrapped,
    message: input.message,
    warnings: input.warnings ?? [],
  }
}

function linuxPlan(input: PlanInput, warnings: string[]): SandboxPlan {
  const platform = input.platform ?? process.platform
  const home = input.home ?? os.homedir()
  const stat = input.stat ?? defaultStat
  const allowWrite = paths(input.config?.allowWrite ?? ["./", "/tmp"], input.cwd, platform, home)
  const allowRead = paths(input.config?.allowRead, input.cwd, platform, home)
  const denyRead = paths(input.config?.denyRead, input.cwd, platform, home)
  const args = ["--die-with-parent", "--ro-bind", "/", "/", "--dev-bind", "/dev", "/dev", "--proc", "/proc"]

  for (const dir of allowRead) {
    if (stat(dir) === "dir") args.push("--ro-bind", dir, dir)
    else warnings.push(`allowRead path is not an existing directory and was skipped: ${dir}`)
  }

  for (const dir of allowWrite) {
    if (stat(dir) === "dir") args.push("--bind", dir, dir)
    else warnings.push(`allowWrite path is not an existing directory and was skipped: ${dir}`)
  }

  for (const denied of denyRead) {
    const kind = stat(denied)
    if (kind === "dir") args.push("--tmpfs", denied)
    else if (kind === "file") args.push("--ro-bind", "/dev/null", denied)
    else warnings.push(`denyRead path does not exist and was skipped: ${denied}`)
  }

  if ((input.config?.allowedDomains?.length ?? 0) > 0 || (input.config?.deniedDomains?.length ?? 0) > 0) {
    warnings.push("OS sandbox mode cannot enforce per-domain network rules yet")
  }

  args.push(input.shell, ...input.shellArgs)
  return {
    status: baseStatus({
      config: input.config,
      platform,
      engine: "bubblewrap",
      status: "active",
      wrapped: true,
      message: "Linux shell command will run through bubblewrap",
      warnings,
    }),
    command: "bwrap",
    args,
  }
}

function profileEscape(input: string) {
  return input.replaceAll("\\", "\\\\").replaceAll('"', '\\"')
}

function seatbeltProfile(input: PlanInput) {
  const platform = input.platform ?? process.platform
  const home = input.home ?? os.homedir()
  const denyRead = paths(input.config?.denyRead, input.cwd, platform, home)
  const denyWrite = paths(input.config?.denyWrite, input.cwd, platform, home)
  const allowWrite = paths(input.config?.allowWrite ?? ["./", "/tmp"], input.cwd, platform, home)
  const lines = ["(version 1)", "(allow default)"]

  for (const denied of denyRead) lines.push(`(deny file-read* (subpath "${profileEscape(denied)}"))`)
  if (allowWrite.length > 0) {
    lines.push("(deny file-write*)")
    for (const allowed of allowWrite) lines.push(`(allow file-write* (subpath "${profileEscape(allowed)}"))`)
  }
  for (const denied of denyWrite) lines.push(`(deny file-write* (subpath "${profileEscape(denied)}"))`)
  if ((input.config?.allowedDomains?.length ?? 0) === 0 && (input.config?.deniedDomains?.length ?? 0) > 0) {
    lines.push("(deny network*)")
  }
  return lines.join("\n")
}

function darwinPlan(input: PlanInput, warnings: string[]): SandboxPlan {
  const platform = input.platform ?? process.platform
  if ((input.config?.allowedDomains?.length ?? 0) > 0 || (input.config?.deniedDomains?.length ?? 0) > 0) {
    warnings.push("OS sandbox mode cannot enforce per-domain network rules yet")
  }
  return {
    status: baseStatus({
      config: input.config,
      platform,
      engine: "seatbelt",
      status: "active",
      wrapped: true,
      message: "macOS shell command will run through sandbox-exec",
      warnings,
    }),
    command: "sandbox-exec",
    args: ["-p", seatbeltProfile(input), input.shell, ...input.shellArgs],
  }
}

export function plan(input: PlanInput): SandboxPlan {
  const platform = input.platform ?? process.platform
  const mode = input.config?.mode ?? "os"
  if (input.config?.enabled !== true || mode === "off") {
    return {
      status: baseStatus({
        config: input.config,
        platform,
        engine: "none",
        status: "disabled",
        wrapped: false,
        message: "MarsbotCode sandbox is disabled",
      }),
    }
  }

  const cap = capability(input)
  if (platform === "win32") {
    return {
      status: baseStatus({
        config: input.config,
        platform,
        engine: "none",
        status: "weak",
        wrapped: false,
        message: "Windows native shell sandbox is weak mode; command is not OS-isolated",
        warnings: ["Run high-risk tasks through WSL or a future Docker sandbox mode"],
      }),
    }
  }

  if (!cap.available) {
    return {
      status: baseStatus({
        config: input.config,
        platform,
        engine: cap.engine,
        status: "unavailable",
        wrapped: false,
        message: cap.detail,
      }),
    }
  }

  const warnings: string[] = []
  if (platform === "linux") return linuxPlan(input, warnings)
  if (platform === "darwin") return darwinPlan(input, warnings)
  return {
    status: baseStatus({
      config: input.config,
      platform,
      engine: "none",
      status: "unavailable",
      wrapped: false,
      message: "unsupported platform",
    }),
  }
}

export function doctorRows(input: { config?: SandboxConfig } & CapabilityInput = {}) {
  const cap = capability(input)
  const enabled = input.config?.enabled === true && (input.config.mode ?? "os") !== "off"
  const rows: Array<[string, string]> = [
    ["Platform", cap.platform],
    ["Config", enabled ? `enabled (${input.config?.mode ?? "os"})` : "disabled"],
    ["OS sandbox", cap.detail],
  ]

  if (cap.platform === "linux") rows.push(["Security note", "Linux sandbox is OS-level isolation, not Docker/VM isolation"])
  else if (cap.platform === "darwin")
    rows.push(["Security note", "macOS sandbox is OS-level isolation, not Docker/VM isolation"])
  else if (cap.platform === "win32") rows.push(["Recommendation", "Run high-risk tasks through WSL or a future Docker sandbox mode"])
  else rows.push(["Security note", "No OS sandbox wrapper is available for this platform"])

  if ((input.config?.allowedDomains?.length ?? 0) > 0 || (input.config?.deniedDomains?.length ?? 0) > 0) {
    rows.push(["Network rules", "configured, but per-domain enforcement is not available in OS mode yet"])
  }

  return rows
}
