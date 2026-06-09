import { Effect } from "effect"
import { UI } from "../ui"
import { effectCmd } from "../effect-cmd"
import { Config } from "@/config/config"
import * as MarsbotSandbox from "@/marsbot/sandbox"

export const SandboxCommand = effectCmd({
  command: "sandbox <action>",
  describe: "inspect MarsbotCode sandbox status",
  builder: (yargs) =>
    yargs.positional("action", {
      describe: "sandbox action",
      choices: ["doctor"] as const,
      demandOption: true,
    }),
  handler: Effect.fn("Cli.sandbox")(function* (args) {
    if (args.action !== "doctor") return
    const cfg = yield* Config.Service.use((config) => config.get())
    UI.println(UI.Style.TEXT_HIGHLIGHT_BOLD + "MarsbotCode sandbox doctor" + UI.Style.TEXT_NORMAL)
    UI.empty()
    for (const [key, value] of MarsbotSandbox.doctorRows({ config: cfg.sandbox })) {
      UI.println(UI.Style.TEXT_DIM + key.padEnd(16) + UI.Style.TEXT_NORMAL + value)
    }
  }),
})
