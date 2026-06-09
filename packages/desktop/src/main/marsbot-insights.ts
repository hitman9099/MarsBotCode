import { readdir, readFile, stat } from "node:fs/promises"
import { homedir } from "node:os"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { parse as parseJsonc } from "jsonc-parser"

type SandboxConfig = {
  enabled?: boolean
  mode?: "os" | "off"
  allowedDomains?: string[]
  deniedDomains?: string[]
}

export type AuditConfig = {
  enabled?: boolean
  path?: string
}

export type MarsbotConfig = {
  sandbox?: SandboxConfig
  audit?: AuditConfig
}

export type MarsbotSandboxInsight = {
  enabled: boolean
  mode: "os" | "off"
  platform: NodeJS.Platform | "none"
  status: "disabled" | "active" | "weak" | "unavailable"
  engine: "bubblewrap" | "seatbelt" | "none"
  message: string
  warnings: string[]
  rows: Array<[string, string]>
}

export type MarsbotAuditRecord = {
  time?: string
  type?: string
  phase?: string
  tool?: string
  sessionID?: string
  messageID?: string
  callID?: string
  data?: unknown
}

export type MarsbotAuditInsight = {
  enabled: boolean
  path: string | null
  records: MarsbotAuditRecord[]
}

export type MarsbotInsights = {
  directory: string | null
  config: {
    path: string | null
  }
  sandbox: MarsbotSandboxInsight
  audit: MarsbotAuditInsight
}

type ReadOptions = {
  platform?: NodeJS.Platform
  limit?: number
  commandExists?: (command: string, args?: string[]) => boolean
}

export const DEFAULT_AUDIT_PATH = ".marsbot/audit"
const CONFIG_FILES = [
  "marsbotcode.jsonc",
  "marsbotcode.json",
  path.join(".marsbotcode", "marsbotcode.jsonc"),
  path.join(".marsbotcode", "marsbotcode.json"),
]

function commandExists(command: string, args: string[] = ["--version"]) {
  const result = spawnSync(command, args, { encoding: "utf8", windowsHide: true })
  return !result.error && result.status !== null
}

function platformCapability(platform: NodeJS.Platform, exists: (command: string, args?: string[]) => boolean) {
  if (platform === "linux") {
    const available = exists("bwrap")
    return {
      engine: "bubblewrap" as const,
      available,
      detail: available ? "available: bubblewrap" : "missing: install bubblewrap",
    }
  }

  if (platform === "darwin") {
    const available = exists("sandbox-exec", ["-h"])
    return {
      engine: "seatbelt" as const,
      available,
      detail: available ? "available: Seatbelt/sandbox-exec" : "missing: sandbox-exec",
    }
  }

  if (platform === "win32") {
    return {
      engine: "none" as const,
      available: false,
      detail: "weak mode: native OS sandbox is not enabled",
    }
  }

  return {
    engine: "none" as const,
    available: false,
    detail: "unsupported platform",
  }
}

function normalizeConfig(input: unknown): MarsbotConfig {
  if (!input || typeof input !== "object") return {}
  const data = input as Record<string, unknown>
  return {
    sandbox: data.sandbox && typeof data.sandbox === "object" ? (data.sandbox as SandboxConfig) : undefined,
    audit: data.audit && typeof data.audit === "object" ? (data.audit as AuditConfig) : undefined,
  }
}

export async function readMarsbotConfig(directory: string): Promise<{ path: string | null; config: MarsbotConfig }> {
  for (const file of CONFIG_FILES) {
    const full = path.join(directory, file)
    try {
      const raw = await readFile(full, "utf8")
      return {
        path: full,
        config: normalizeConfig(parseJsonc(raw)),
      }
    } catch {
      continue
    }
  }
  return {
    path: null,
    config: {},
  }
}

export function resolveMarsbotProjectPath(directory: string, value: string) {
  const expanded =
    value === "~"
      ? homedir()
      : value.startsWith("~/") || value.startsWith("~\\")
        ? path.join(homedir(), value.slice(2))
        : value
  return path.isAbsolute(expanded) ? path.normalize(expanded) : path.join(directory, expanded)
}

function hasNetworkRules(config?: SandboxConfig) {
  return (config?.allowedDomains?.length ?? 0) > 0 || (config?.deniedDomains?.length ?? 0) > 0
}

function unavailableSandbox(message: string): MarsbotSandboxInsight {
  return {
    enabled: false,
    mode: "os",
    platform: "none",
    status: "unavailable",
    engine: "none",
    message,
    warnings: [],
    rows: [["Project", message]],
  }
}

function sandboxInsight(
  config: SandboxConfig | undefined,
  platform: NodeJS.Platform,
  exists: (command: string, args?: string[]) => boolean,
) {
  const mode = config?.mode ?? "os"
  const enabled = config?.enabled === true && mode !== "off"
  const cap = platformCapability(platform, exists)
  const rows: Array<[string, string]> = [
    ["Platform", platform],
    ["Config", enabled ? `enabled (${mode})` : "disabled"],
    ["OS sandbox", cap.detail],
  ]

  if (platform === "linux") rows.push(["Security note", "Linux sandbox is OS-level isolation, not Docker/VM isolation"])
  else if (platform === "darwin") rows.push(["Security note", "macOS sandbox is OS-level isolation, not Docker/VM isolation"])
  else if (platform === "win32") rows.push(["Recommendation", "Run high-risk tasks through WSL or a future Docker sandbox mode"])
  else rows.push(["Security note", "No OS sandbox wrapper is available for this platform"])

  if (hasNetworkRules(config)) {
    rows.push(["Network rules", "configured, but per-domain enforcement is not available in OS mode yet"])
  }

  if (!enabled) {
    return {
      enabled,
      mode,
      platform,
      status: "disabled" as const,
      engine: "none" as const,
      message: "MarsbotCode sandbox is disabled",
      warnings: [],
      rows,
    }
  }

  if (platform === "win32") {
    return {
      enabled,
      mode,
      platform,
      status: "weak" as const,
      engine: "none" as const,
      message: "Windows native shell sandbox is weak mode; command is not OS-isolated",
      warnings: ["Run high-risk tasks through WSL or a future Docker sandbox mode"],
      rows,
    }
  }

  if (!cap.available) {
    return {
      enabled,
      mode,
      platform,
      status: "unavailable" as const,
      engine: cap.engine,
      message: cap.detail,
      warnings: [],
      rows,
    }
  }

  return {
    enabled,
    mode,
    platform,
    status: "active" as const,
    engine: cap.engine,
    message:
      platform === "darwin"
        ? "macOS shell command will run through sandbox-exec"
        : "Linux shell command will run through bubblewrap",
    warnings: hasNetworkRules(config) ? ["OS sandbox mode cannot enforce per-domain network rules yet"] : [],
    rows,
  }
}

async function auditRecords(dir: string, limit: number) {
  let files: string[]
  try {
    files = (await readdir(dir)).filter((file) => file.endsWith(".jsonl")).sort().reverse()
  } catch {
    return []
  }

  const records: MarsbotAuditRecord[] = []
  for (const file of files) {
    const full = path.join(dir, file)
    let text: string
    try {
      text = await readFile(full, "utf8")
    } catch {
      continue
    }
    const lines = text.split(/\r?\n/).filter(Boolean).reverse()
    for (const line of lines) {
      try {
        records.push(JSON.parse(line) as MarsbotAuditRecord)
      } catch {
        continue
      }
      if (records.length >= limit) return records
    }
  }
  return records
}

async function auditInsight(directory: string, config: AuditConfig | undefined, limit: number): Promise<MarsbotAuditInsight> {
  const enabled = config?.enabled === true
  const auditPath = resolveMarsbotProjectPath(directory, config?.path?.trim() || DEFAULT_AUDIT_PATH)
  if (!enabled) return { enabled, path: auditPath, records: [] }
  return {
    enabled,
    path: auditPath,
    records: await auditRecords(auditPath, limit),
  }
}

async function directoryExists(directory: string) {
  try {
    return (await stat(directory)).isDirectory()
  } catch {
    return false
  }
}

export async function readMarsbotInsights(
  directory: string | undefined | null,
  options: ReadOptions = {},
): Promise<MarsbotInsights> {
  if (!directory || !(await directoryExists(directory))) {
    return {
      directory: null,
      config: { path: null },
      sandbox: unavailableSandbox("Open a local project to inspect MarsbotCode status"),
      audit: { enabled: false, path: null, records: [] },
    }
  }

  const { config, path: configPath } = await readMarsbotConfig(directory)
  const platform = options.platform ?? process.platform
  const exists = options.commandExists ?? commandExists
  return {
    directory,
    config: { path: configPath },
    sandbox: sandboxInsight(config.sandbox, platform, exists),
    audit: await auditInsight(directory, config.audit, options.limit ?? 8),
  }
}
