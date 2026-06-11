import { describe, expect, test } from "bun:test"

import type { MarsbotAuditLogRecord } from "@/context/platform"
import { buildMarsbotPermissionSummary } from "./marsbot-permission-summary"

function record(input: Partial<MarsbotAuditLogRecord>): MarsbotAuditLogRecord {
  return {
    type: input.type,
    phase: input.phase,
    tool: input.tool,
    time: input.time,
    sessionID: input.sessionID ?? "ses_1",
    messageID: input.messageID,
    callID: input.callID,
    data: input.data,
    title: input.title ?? input.phase ?? "audit event",
    summary: input.summary ?? "",
    source: input.source ?? { file: "2026-06-11.jsonl", line: 1 },
  }
}

describe("buildMarsbotPermissionSummary", () => {
  test("groups permission requests with granted, rejected, and pending decisions", () => {
    const result = buildMarsbotPermissionSummary({
      records: [
        record({
          type: "tool",
          phase: "tool.after",
          tool: "bash",
          callID: "tool_1",
          time: "2026-06-11T08:00:00.000Z",
          title: "npm test",
        }),
        record({
          type: "permission",
          phase: "permission.request",
          tool: "edit",
          callID: "call_edit",
          time: "2026-06-11T08:01:00.000Z",
          data: {
            permission: "edit",
            patterns: ["src/app.ts"],
            metadata: { title: "Edit src/app.ts", description: "Agent wants to update the app shell." },
          },
        }),
        record({
          type: "permission",
          phase: "permission.granted",
          tool: "edit",
          callID: "call_edit",
          time: "2026-06-11T08:02:00.000Z",
          data: {
            permission: "edit",
            patterns: ["src/app.ts"],
            metadata: { title: "Edit src/app.ts" },
          },
        }),
        record({
          type: "permission",
          phase: "permission.request",
          tool: "bash",
          callID: "call_danger",
          time: "2026-06-11T08:03:00.000Z",
          data: {
            permission: "bash",
            patterns: ["rm -rf dist"],
            metadata: { title: "Dangerous cleanup" },
          },
        }),
        record({
          type: "permission",
          phase: "permission.rejected",
          tool: "bash",
          callID: "call_danger",
          time: "2026-06-11T08:04:00.000Z",
          data: {
            request: {
              permission: "bash",
              patterns: ["rm -rf dist"],
              metadata: { title: "Dangerous cleanup" },
            },
            error: { message: "User rejected the command." },
          },
        }),
        record({
          type: "permission",
          phase: "permission.request",
          tool: "bash",
          callID: "call_pending",
          time: "2026-06-11T08:05:00.000Z",
          data: {
            permission: "bash",
            patterns: ["npm install"],
            metadata: { description: "Install dependencies." },
          },
        }),
      ],
    })

    expect(result.stats).toEqual({
      requests: 3,
      granted: 1,
      rejected: 1,
      pending: 1,
    })
    expect(result.rows.map((item) => [item.id, item.decision])).toEqual([
      ["call_pending", "pending"],
      ["call_danger", "rejected"],
      ["call_edit", "granted"],
    ])
    expect(result.rows[1]).toMatchObject({
      permission: "bash",
      title: "Dangerous cleanup",
      patterns: ["rm -rf dist"],
    })
  })

  test("filters rows by decision, query, and limit", () => {
    const records = [
      record({
        type: "permission",
        phase: "permission.request",
        tool: "bash",
        callID: "call_danger",
        time: "2026-06-11T08:03:00.000Z",
        data: { permission: "bash", patterns: ["rm -rf dist"], metadata: { title: "Dangerous cleanup" } },
      }),
      record({
        type: "permission",
        phase: "permission.rejected",
        tool: "bash",
        callID: "call_danger",
        time: "2026-06-11T08:04:00.000Z",
        data: {
          request: { permission: "bash", patterns: ["rm -rf dist"], metadata: { title: "Dangerous cleanup" } },
        },
      }),
      record({
        type: "permission",
        phase: "permission.request",
        tool: "edit",
        callID: "call_edit",
        time: "2026-06-11T08:05:00.000Z",
        data: { permission: "edit", patterns: ["README.md"], metadata: { title: "Update README" } },
      }),
    ]

    const result = buildMarsbotPermissionSummary({
      records,
      decision: "rejected",
      query: "danger",
      limit: 1,
    })

    expect(result.rows.map((item) => item.id)).toEqual(["call_danger"])
    expect(result.filtered).toBe(1)
    expect(result.returned).toBe(1)
  })

  test("uses readable fallback values for sparse permission records", () => {
    const result = buildMarsbotPermissionSummary({
      records: [
        record({
          phase: "permission.request",
          time: "2026-06-11T08:00:00.000Z",
          title: "permission.request",
          source: { file: "2026-06-11.jsonl", line: 42 },
        }),
      ],
    })

    expect(result.rows).toHaveLength(1)
    expect(result.rows[0]).toMatchObject({
      id: "2026-06-11.jsonl:42",
      decision: "pending",
      title: "permission.request",
      source: { file: "2026-06-11.jsonl", line: 42 },
    })
  })
})
