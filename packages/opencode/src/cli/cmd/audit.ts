import fs from "node:fs/promises"
import path from "node:path"
import { Effect } from "effect"
import { UI } from "../ui"
import { effectCmd } from "../effect-cmd"

async function readAuditLines(limit: number) {
  const dir = path.join(process.cwd(), ".marsbot", "audit")
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
  instance: false,
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
      }),
  handler: Effect.fn("Cli.audit")(function* (args) {
    if (args.action !== "list") return
    const lines = yield* Effect.promise(() => readAuditLines(args.limit ?? 20))
    if (lines.length === 0) {
      UI.println("No MarsbotCode audit records found in .marsbot/audit.")
      return
    }
    for (const line of lines) UI.println(line)
  }),
})
