import type { MarsbotAuditLogRecord } from "@/context/platform"

export type MarsbotPermissionDecision = "pending" | "granted" | "rejected"
export type MarsbotPermissionFilter = MarsbotPermissionDecision | "all"

export type MarsbotPermissionRow = {
  id: string
  decision: MarsbotPermissionDecision
  permission: string
  title: string
  summary: string
  patterns: string[]
  sessionID?: string
  callID?: string
  time?: string
  source: MarsbotAuditLogRecord["source"]
}

export type MarsbotPermissionSummary = {
  stats: {
    requests: number
    granted: number
    rejected: number
    pending: number
  }
  filtered: number
  returned: number
  rows: MarsbotPermissionRow[]
}

export type MarsbotPermissionSummaryInput = {
  records: MarsbotAuditLogRecord[]
  query?: string
  decision?: MarsbotPermissionFilter
  limit?: number
}

type PermissionEvent = "request" | "granted" | "rejected"

type PermissionGroup = {
  id: string
  records: MarsbotAuditLogRecord[]
  request?: MarsbotAuditLogRecord
  decision?: MarsbotAuditLogRecord
}

function dataObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined
  return value as Record<string, unknown>
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function timestamp(record: MarsbotAuditLogRecord) {
  if (!record.time) return 0
  const value = Date.parse(record.time)
  return Number.isNaN(value) ? 0 : value
}

function isPermissionRecord(record: MarsbotAuditLogRecord) {
  return record.type === "permission" || record.phase?.startsWith("permission.") === true
}

function event(record: MarsbotAuditLogRecord): PermissionEvent {
  if (record.phase === "permission.granted") return "granted"
  if (record.phase === "permission.rejected") return "rejected"
  return "request"
}

function requestData(record: MarsbotAuditLogRecord) {
  const data = dataObject(record.data)
  const request = dataObject(data?.request)
  return request ?? data
}

function patterns(record: MarsbotAuditLogRecord) {
  const data = requestData(record)
  if (Array.isArray(data?.patterns)) return data.patterns.filter((item): item is string => typeof item === "string")
  const pattern = text(data?.pattern)
  return pattern ? [pattern] : []
}

function metadata(record: MarsbotAuditLogRecord) {
  return dataObject(requestData(record)?.metadata)
}

function groupID(record: MarsbotAuditLogRecord) {
  const data = requestData(record)
  return (
    text(data?.permissionID) ||
    text(data?.id) ||
    record.callID ||
    `${record.source.file}:${record.source.line}`
  )
}

function permissionName(record: MarsbotAuditLogRecord) {
  return text(requestData(record)?.permission) || record.tool || "permission"
}

function rowTitle(record: MarsbotAuditLogRecord) {
  return (
    text(metadata(record)?.title) ||
    text(requestData(record)?.title) ||
    text(record.title) ||
    permissionName(record)
  )
}

function rowSummary(record: MarsbotAuditLogRecord) {
  const data = dataObject(record.data)
  const error = dataObject(data?.error)
  return (
    text(metadata(record)?.description) ||
    text(requestData(record)?.description) ||
    text(error?.message) ||
    text(record.summary)
  )
}

function newer(current: MarsbotAuditLogRecord | undefined, next: MarsbotAuditLogRecord) {
  if (!current) return next
  return timestamp(next) >= timestamp(current) ? next : current
}

function rowDecision(group: PermissionGroup): MarsbotPermissionDecision {
  if (!group.decision) return "pending"
  const value = event(group.decision)
  return value === "request" ? "pending" : value
}

function rowRecord(group: PermissionGroup) {
  return group.decision ?? group.request ?? group.records[0]
}

function rowTime(group: PermissionGroup) {
  return group.records.map(timestamp).sort((a, b) => b - a)[0] ?? 0
}

function matchesQuery(row: MarsbotPermissionRow, query: string | undefined) {
  const needle = query?.trim().toLowerCase()
  if (!needle) return true
  return [
    row.id,
    row.decision,
    row.permission,
    row.title,
    row.summary,
    row.sessionID,
    row.callID,
    row.source.file,
    String(row.source.line),
    ...row.patterns,
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase()
    .includes(needle)
}

function limitValue(value: number | undefined) {
  if (!Number.isFinite(value) || value === undefined) return 200
  return Math.max(1, Math.floor(value))
}

export function buildMarsbotPermissionSummary(input: MarsbotPermissionSummaryInput): MarsbotPermissionSummary {
  const groups = new Map<string, PermissionGroup>()

  for (const record of input.records.filter(isPermissionRecord)) {
    const id = groupID(record)
    const group = groups.get(id) ?? { id, records: [] }
    const kind = event(record)
    group.records.push(record)
    if (kind === "request") group.request = newer(group.request, record)
    if (kind !== "request") group.decision = newer(group.decision, record)
    groups.set(id, group)
  }

  const rows = Array.from(groups.values())
    .map((group) => {
      const record = rowRecord(group)
      return {
        id: group.id,
        decision: rowDecision(group),
        permission: permissionName(record),
        title: rowTitle(record),
        summary: rowSummary(record),
        patterns: patterns(record),
        sessionID: record.sessionID,
        callID: record.callID,
        time: record.time,
        source: record.source,
      }
    })
    .sort((a, b) => {
      const left = groups.get(a.id)
      const right = groups.get(b.id)
      return rowTime(right!) - rowTime(left!)
    })

  const decision = input.decision ?? "all"
  const filtered = rows.filter((row) => (decision === "all" ? true : row.decision === decision)).filter((row) => matchesQuery(row, input.query))
  const limited = filtered.slice(0, limitValue(input.limit))

  return {
    stats: {
      requests: rows.length,
      granted: rows.filter((row) => row.decision === "granted").length,
      rejected: rows.filter((row) => row.decision === "rejected").length,
      pending: rows.filter((row) => row.decision === "pending").length,
    },
    filtered: filtered.length,
    returned: limited.length,
    rows: limited,
  }
}
