import { spawnSync } from "node:child_process"
import { Effect } from "effect"
import { UI } from "../ui"
import { effectCmd } from "../effect-cmd"

function exists(command: string, args: string[] = ["--version"]) {
  const result = spawnSync(command, args, { encoding: "utf8", windowsHide: true })
  return !result.error && result.status !== null
}

function doctor() {
  const platform = process.platform
  const rows: Array<[string, string]> = [["Platform", platform]]

  if (platform === "linux") {
    rows.push(["OS sandbox", exists("bwrap") ? "available: bubblewrap" : "missing: install bubblewrap"])
    rows.push(["Security note", "Linux sandbox is OS-level isolation, not Docker/VM isolation"])
  } else if (platform === "darwin") {
    rows.push(["OS sandbox", exists("sandbox-exec", ["-h"]) ? "available: Seatbelt/sandbox-exec" : "missing"])
    rows.push(["Security note", "macOS sandbox is OS-level isolation, not Docker/VM isolation"])
  } else if (platform === "win32") {
    rows.push(["OS sandbox", "weak mode: native OS sandbox is not enabled"])
    rows.push(["Recommendation", "Run high-risk tasks through WSL or a future Docker sandbox mode"])
  } else {
    rows.push(["OS sandbox", "unsupported platform"])
  }

  return rows
}

export const SandboxCommand = effectCmd({
  command: "sandbox <action>",
  describe: "inspect MarsbotCode sandbox status",
  instance: false,
  builder: (yargs) =>
    yargs.positional("action", {
      describe: "sandbox action",
      choices: ["doctor"] as const,
      demandOption: true,
    }),
  handler: Effect.fn("Cli.sandbox")(function* (args) {
    if (args.action !== "doctor") return
    UI.println(UI.Style.TEXT_HIGHLIGHT_BOLD + "MarsbotCode sandbox doctor" + UI.Style.TEXT_NORMAL)
    UI.empty()
    for (const [key, value] of doctor()) {
      UI.println(UI.Style.TEXT_DIM + key.padEnd(16) + UI.Style.TEXT_NORMAL + value)
    }
  }),
})
