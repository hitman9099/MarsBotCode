import { afterEach, describe, expect, test } from "bun:test"
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"

import { readMarsbotInsights } from "./marsbot-insights"

const roots: string[] = []

async function tempProject() {
  const root = await mkdtemp(join(tmpdir(), "marsbot-insights-"))
  roots.push(root)
  return root
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

describe("MarsbotCode desktop insights", () => {
  test("reports Windows weak sandbox and reads recent audit records", async () => {
    const root = await tempProject()
    await writeFile(
      join(root, "marsbotcode.json"),
      JSON.stringify({
        sandbox: { enabled: true, mode: "os", allowedDomains: ["github.com"] },
        audit: { enabled: true, path: ".marsbot/audit" },
      }),
    )
    await mkdir(join(root, ".marsbot/audit"), { recursive: true })
    await writeFile(
      join(root, ".marsbot/audit/2026-06-09.jsonl"),
      [
        JSON.stringify({
          time: "2026-06-09T10:00:00.000Z",
          type: "tool",
          phase: "tool.after",
          tool: "bash",
          data: { title: "run tests" },
        }),
        JSON.stringify({
          time: "2026-06-09T10:01:00.000Z",
          type: "permission",
          phase: "permission.granted",
          tool: "bash",
          data: { pattern: "npm test" },
        }),
      ].join("\n") + "\n",
    )

    const result = await readMarsbotInsights(root, { platform: "win32", limit: 5 })

    expect(result.directory).toBe(root)
    expect(result.config.path).toBe(join(root, "marsbotcode.json"))
    expect(result.sandbox.status).toBe("weak")
    expect(result.sandbox.engine).toBe("none")
    expect(result.sandbox.message).toBe("Windows native shell sandbox is weak mode; command is not OS-isolated")
    expect(result.sandbox.rows).toContainEqual([
      "Network rules",
      "configured, but per-domain enforcement is not available in OS mode yet",
    ])
    expect(result.audit.enabled).toBe(true)
    expect(result.audit.path).toBe(join(root, ".marsbot/audit"))
    expect(result.audit.records.map((record) => record.phase)).toEqual(["permission.granted", "tool.after"])
    expect(result.audit.records[0]?.tool).toBe("bash")
  })

  test("prefers marsbotcode jsonc over marsbotcode json", async () => {
    const root = await tempProject()
    await writeFile(join(root, "marsbotcode.json"), JSON.stringify({ sandbox: { enabled: false } }))
    await writeFile(
      join(root, "marsbotcode.jsonc"),
      `{
        // JSONC should win over JSON in the same directory.
        "sandbox": { "enabled": true, "mode": "os" },
        "audit": { "enabled": true, "path": ".custom-audit" },
      }`,
    )

    const result = await readMarsbotInsights(root, {
      platform: "linux",
      commandExists: () => true,
    })

    expect(result.config.path).toBe(join(root, "marsbotcode.jsonc"))
    expect(result.sandbox.status).toBe("active")
    expect(result.sandbox.engine).toBe("bubblewrap")
    expect(result.audit.enabled).toBe(true)
    expect(result.audit.path).toBe(join(root, ".custom-audit"))
  })

  test("reports unavailable insights when no project directory is selected", async () => {
    const result = await readMarsbotInsights(undefined, { platform: "darwin" })

    expect(result.directory).toBeNull()
    expect(result.config.path).toBeNull()
    expect(result.sandbox.status).toBe("unavailable")
    expect(result.audit.enabled).toBe(false)
    expect(result.audit.records).toEqual([])
  })
})
