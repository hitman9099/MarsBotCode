import fs from "node:fs/promises"
import path from "node:path"
import { Effect } from "effect"
import { Config } from "@/config/config"
import * as MarsbotAudit from "@/marsbot/audit"
import { UI } from "../ui"
import { effectCmd } from "../effect-cmd"

async function readAuditLines(dir: string, limit: number) {
  const files = await fs
    .readdir(dir)
    .then((items) => items.filter((item) => item.endsWith(".jsonl")).sort())
    .catch(() => [])

  const lines: string[] = []
  for (const file of files.slice(-5)) {
    const text = await fs.readFile(path.join(dir, file), "utf8").catch(() => "")
    for (const line of text.split(/\r?\n/)) {
      if (line.trim()) lines.push(line)
    }
  }
  return lines.slice(-limit)
}

export const AuditCommand = effectCmd({
  command: "audit <action>",
  describe: "inspect MarsbotCode audit logs",
  builder: (yargs) =>
    yargs
      .positional("action", {
        describe: "audit action",
        choices: ["list"] as const,
        demandOption: true,
      })
      .option("limit", {
        describe: "maximum audit rows to print",
        type: "number",
        default: 20,
      })
      .option("path", {
        describe: "audit log directory to inspect",
        type: "string",
      }),
  handler: Effect.fn("Cli.audit")(function* (args) {
    if (args.action !== "list") return
    const cfg = yield* Config.Service.use((config) => config.get())
    const auditPath = typeof args.path === "string" ? args.path : undefined
    const dir = auditPath
      ? path.resolve(process.cwd(), auditPath)
      : MarsbotAudit.resolveDirectory(cfg.audit, process.cwd())
    const lines = yield* Effect.promise(() => readAuditLines(dir, args.limit ?? 20))
    if (lines.length === 0) {
      UI.println(`No MarsbotCode audit records found in ${dir}.`)
      return
    }
    for (const line of lines) UI.println(line)
  }),
})
