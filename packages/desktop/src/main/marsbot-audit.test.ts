import { afterEach, describe, expect, test } from "bun:test"
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { readMarsbotAudit } from "./marsbot-audit"

const roots: string[] = []

async function tempProject() {
  const root = await mkdtemp(join(tmpdir(), "marsbot-audit-"))
  roots.push(root)
  return root
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

describe("MarsbotCode desktop audit log", () => {
  test("reads audit records with query and type filters", async () => {
    const root = await tempProject()
    await writeFile(
      join(root, "marsbotcode.jsonc"),
      `{
        "audit": { "enabled": true, "path": ".custom-audit" }
      }`,
    )
    await mkdir(join(root, ".custom-audit"), { recursive: true })
    await writeFile(
      join(root, ".custom-audit/2026-06-09.jsonl"),
      [
        JSON.stringify({
          time: "2026-06-09T10:00:00.000Z",
          type: "tool",
          phase: "tool.after",
          tool: "bash",
          data: { title: "run tests" },
        }),
        "not-json",
        JSON.stringify({
          time: "2026-06-09T10:01:00.000Z",
          type: "permission",
          phase: "permission.granted",
          tool: "bash",
          data: { pattern: "npm test" },
        }),
      ].join("\n") + "\n",
    )

    const result = await readMarsbotAudit(root, { query: "npm", type: "permission", limit: 20 })

    expect(result.directory).toBe(root)
    expect(result.enabled).toBe(true)
    expect(result.path).toBe(join(root, ".custom-audit"))
    expect(result.total).toBe(1)
    expect(result.returned).toBe(1)
    expect(result.skipped).toBe(1)
    expect(result.records[0]?.phase).toBe("permission.granted")
    expect(result.records[0]?.source.file).toBe("2026-06-09.jsonl")
    expect(result.records[0]?.title).toBe("npm test")
  })

  test("returns disabled status without reading records when audit is disabled", async () => {
    const root = await tempProject()
    await writeFile(join(root, "marsbotcode.json"), JSON.stringify({ audit: { enabled: false } }))
    await mkdir(join(root, ".marsbot/audit"), { recursive: true })
    await writeFile(
      join(root, ".marsbot/audit/2026-06-09.jsonl"),
      JSON.stringify({ time: "2026-06-09T10:00:00.000Z", type: "tool", phase: "tool.after" }) + "\n",
    )

    const result = await readMarsbotAudit(root)

    expect(result.enabled).toBe(false)
    expect(result.path).toBe(join(root, ".marsbot/audit"))
    expect(result.total).toBe(0)
    expect(result.records).toEqual([])
  })

  test("returns unavailable status when no project directory is selected", async () => {
    const result = await readMarsbotAudit(undefined)

    expect(result.directory).toBeNull()
    expect(result.enabled).toBe(false)
    expect(result.path).toBeNull()
    expect(result.records).toEqual([])
  })
})
