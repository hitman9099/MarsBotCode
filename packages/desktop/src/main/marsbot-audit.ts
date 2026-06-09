import { readdir, readFile, stat } from "node:fs/promises"
import path from "node:path"

import {
  DEFAULT_AUDIT_PATH,
  readMarsbotConfig,
  resolveMarsbotProjectPath,
  type MarsbotAuditRecord,
} from "./marsbot-insights"

export type MarsbotAuditReadOptions = {
  limit?: number
  query?: string
  type?: string
  tool?: string
}

export type MarsbotAuditLogRecord = MarsbotAuditRecord & {
  title: string
  summary: string
  source: {
    file: string
    line: number
  }
}

export type MarsbotAuditLog = {
  directory: string | null
  enabled: boolean
  path: string | null
  total: number
  returned: number
  skipped: number
  records: MarsbotAuditLogRecord[]
}

const DEFAULT_LIMIT = 200
const MAX_LIMIT = 500

async function directoryExists(directory: string) {
  try {
    return (await stat(directory)).isDirectory()
  } catch {
    return false
  }
}

function limitValue(input: number | undefined) {
  if (!Number.isFinite(input) || input === undefined) return DEFAULT_LIMIT
  return Math.max(1, Math.min(MAX_LIMIT, Math.floor(input)))
}

function stringifyData(value: unknown) {
  if (!value || typeof value !== "object") return ""
  try {
    return JSON.stringify(value)
  } catch {
    return ""
  }
}

function textField(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function recordTitle(record: MarsbotAuditRecord) {
  const data = record.data && typeof record.data === "object" ? (record.data as Record<string, unknown>) : undefined
  return (
    textField(data?.title) ||
    textField(data?.command) ||
    textField(data?.pattern) ||
    record.tool ||
    record.phase ||
    record.type ||
    "audit event"
  )
}

function recordSummary(record: MarsbotAuditRecord) {
  const data = record.data && typeof record.data === "object" ? (record.data as Record<string, unknown>) : undefined
  return textField(data?.description) || textField(data?.message) || stringifyData(record.data)
}

function searchable(record: MarsbotAuditLogRecord) {
  return [
    record.time,
    record.type,
    record.phase,
    record.tool,
    record.sessionID,
    record.messageID,
    record.callID,
    record.title,
    record.summary,
    stringifyData(record.data),
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase()
}

function matchesType(record: MarsbotAuditLogRecord, type: string | undefined) {
  if (!type || type === "all") return true
  const normalized = type.toLowerCase()
  if (normalized === "shell") return record.tool === "bash" || record.tool === "shell"
  return record.type === normalized || record.phase?.startsWith(`${normalized}.`) === true
}

function matchesTool(record: MarsbotAuditLogRecord, tool: string | undefined) {
  if (!tool || tool === "all") return true
  return record.tool === tool
}

function matchesQuery(record: MarsbotAuditLogRecord, query: string | undefined) {
  const needle = query?.trim().toLowerCase()
  if (!needle) return true
  return searchable(record).includes(needle)
}

function timestamp(record: MarsbotAuditLogRecord) {
  if (!record.time) return 0
  const value = Date.parse(record.time)
  return Number.isNaN(value) ? 0 : value
}

async function readAuditRecords(auditPath: string) {
  const records: MarsbotAuditLogRecord[] = []
  let skipped = 0
  let files: string[]
  try {
    files = (await readdir(auditPath)).filter((file) => file.endsWith(".jsonl")).sort().reverse()
  } catch {
    return { records, skipped }
  }

  for (const file of files) {
    const full = path.join(auditPath, file)
    let text: string
    try {
      text = await readFile(full, "utf8")
    } catch {
      skipped += 1
      continue
    }

    const lines = text.split(/\r?\n/)
    for (let index = lines.length - 1; index >= 0; index--) {
      const line = lines[index]?.trim()
      if (!line) continue
      try {
        const record = JSON.parse(line) as MarsbotAuditRecord
        records.push({
          ...record,
          title: recordTitle(record),
          summary: recordSummary(record),
          source: {
            file,
            line: index + 1,
          },
        })
      } catch {
        skipped += 1
      }
    }
  }

  records.sort((a, b) => timestamp(b) - timestamp(a))
  return { records, skipped }
}

export async function readMarsbotAudit(
  directory: string | undefined | null,
  options: MarsbotAuditReadOptions = {},
): Promise<MarsbotAuditLog> {
  if (!directory || !(await directoryExists(directory))) {
    return {
      directory: null,
      enabled: false,
      path: null,
      total: 0,
      returned: 0,
      skipped: 0,
      records: [],
    }
  }

  const { config } = await readMarsbotConfig(directory)
  const enabled = config.audit?.enabled === true
  const auditPath = resolveMarsbotProjectPath(directory, config.audit?.path?.trim() || DEFAULT_AUDIT_PATH)
  if (!enabled) {
    return {
      directory,
      enabled,
      path: auditPath,
      total: 0,
      returned: 0,
      skipped: 0,
      records: [],
    }
  }

  const { records, skipped } = await readAuditRecords(auditPath)
  const filtered = records.filter(
    (record) => matchesType(record, options.type) && matchesTool(record, options.tool) && matchesQuery(record, options.query),
  )
  const limited = filtered.slice(0, limitValue(options.limit))

  return {
    directory,
    enabled,
    path: auditPath,
    total: filtered.length,
    returned: limited.length,
    skipped,
    records: limited,
  }
}
