import crypto from "node:crypto"
import fs from "node:fs/promises"
import path from "node:path"

const DEFAULT_AUDIT_PATH = ".marsbot/audit"
const MAX_STRING_PREVIEW = 2_000
const MAX_OUTPUT_PREVIEW = 4_000
const MAX_ARRAY_ITEMS = 20
const MAX_DEPTH = 5

type AuditConfig = {
  enabled?: boolean
  path?: string
}

export type AuditPhase =
  | "tool.before"
  | "tool.after"
  | "tool.error"
  | "permission.request"
  | "permission.granted"
  | "permission.rejected"

export type AuditRecord = {
  type: "tool" | "permission"
  phase: AuditPhase
  sessionID: string
  messageID?: string
  callID?: string
  agent?: string
  model?: {
    providerID: string
    id: string
  }
  tool?: string
  directory: string
  data?: unknown
}

type WriteInput = {
  config?: AuditConfig
  directory: string
  record: AuditRecord
}

function digest(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex")
}

function summarizeText(input: string, max = MAX_STRING_PREVIEW, preview = true) {
  const chars = input.length
  const bytes = Buffer.byteLength(input, "utf8")
  if (preview && chars <= max && bytes <= max * 4) return input
  return {
    type: "text-summary",
    chars,
    bytes,
    sha256: digest(input),
    ...(preview ? { preview: input.slice(0, max) } : {}),
  }
}

function isSensitiveKey(key: string) {
  return /api[_-]?key|authorization|cookie|credential|password|secret|token/i.test(key)
}

function isContentKey(key: string) {
  return /^(content|oldString|newString)$/i.test(key)
}

function sanitize(value: unknown, key = "", depth = 0, seen = new WeakSet<object>()): unknown {
  if (isSensitiveKey(key)) return "[redacted]"
  if (typeof value === "string") return summarizeText(value, MAX_STRING_PREVIEW, !isContentKey(key))
  if (typeof value === "number" || typeof value === "boolean" || value === null) return value
  if (typeof value === "bigint") return value.toString()
  if (typeof value === "undefined") return undefined
  if (typeof value === "function") return "[function]"
  if (typeof value !== "object") return String(value)
  if (seen.has(value)) return "[circular]"
  if (depth >= MAX_DEPTH) return "[max-depth]"

  seen.add(value)
  if (Array.isArray(value)) {
    const items = value.slice(0, MAX_ARRAY_ITEMS).map((item) => sanitize(item, key, depth + 1, seen))
    if (value.length > MAX_ARRAY_ITEMS) {
      items.push({ type: "array-summary", omitted: value.length - MAX_ARRAY_ITEMS })
    }
    return items
  }

  const out: Record<string, unknown> = {}
  for (const [entryKey, entryValue] of Object.entries(value)) {
    const next = sanitize(entryValue, entryKey, depth + 1, seen)
    if (typeof next !== "undefined") out[entryKey] = next
  }
  return out
}

export function toolArgs(tool: string, args: unknown) {
  if (!args || typeof args !== "object") return sanitize(args)
  const input = args as Record<string, unknown>
  if (tool === "bash") {
    return sanitize({
      command: input.command,
      description: input.description,
      workdir: input.workdir,
      timeout: input.timeout,
    })
  }
  if (tool === "write") {
    return sanitize({
      filePath: input.filePath,
      content: input.content,
    })
  }
  if (tool === "edit") {
    return sanitize({
      filePath: input.filePath,
      oldString: input.oldString,
      newString: input.newString,
      replaceAll: input.replaceAll,
    })
  }
  return sanitize(args)
}

export function toolOutput(output: unknown) {
  if (!output || typeof output !== "object") return sanitize(output)
  const input = output as Record<string, unknown>
  return sanitize({
    title: input.title,
    metadata: input.metadata,
    outputPreview: typeof input.output === "string" ? summarizeText(input.output, MAX_OUTPUT_PREVIEW) : input.output,
    attachments:
      Array.isArray(input.attachments) &&
      input.attachments.map((attachment) => {
        if (!attachment || typeof attachment !== "object") return sanitize(attachment)
        const item = attachment as Record<string, unknown>
        return sanitize({
          id: item.id,
          mime: item.mime,
          filename: item.filename,
          url: typeof item.url === "string" ? summarizeText(item.url, 300, false) : item.url,
        })
      }),
  })
}

export function permission(input: unknown) {
  return sanitize(input)
}

export function error(input: unknown) {
  if (input instanceof Error) {
    return sanitize({
      name: input.name,
      message: input.message,
      stack: input.stack,
    })
  }
  return sanitize(input)
}

export function resolveDirectory(config: AuditConfig | undefined, directory: string) {
  const configured = config?.path?.trim() || DEFAULT_AUDIT_PATH
  return path.isAbsolute(configured) ? configured : path.join(directory, configured)
}

function auditDirectory(config: AuditConfig | undefined, directory: string) {
  if (config?.enabled !== true) return
  return resolveDirectory(config, directory)
}

function auditFile(dir: string, now: Date) {
  const day = now.toISOString().slice(0, 10)
  return path.join(dir, `${day}.jsonl`)
}

export async function write(input: WriteInput) {
  const dir = auditDirectory(input.config, input.directory)
  if (!dir) return

  const now = new Date()
  const payload = {
    version: 1,
    time: now.toISOString(),
    ...input.record,
    data: sanitize(input.record.data),
  }

  await fs.mkdir(dir, { recursive: true })
  await fs.appendFile(auditFile(dir, now), JSON.stringify(payload) + "\n", "utf8")
}
