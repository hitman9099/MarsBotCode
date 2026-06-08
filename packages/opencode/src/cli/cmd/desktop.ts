import { Effect } from "effect"
import open from "open"
import { UI } from "../ui"
import { effectCmd } from "../effect-cmd"

export const DesktopCommand = effectCmd({
  command: "desktop",
  describe: "open MarsbotCode Desktop",
  instance: false,
  handler: Effect.fn("Cli.desktop")(function* () {
    const target = "marsbotcode://open"
    yield* Effect.promise(() => open(target)).pipe(
      Effect.catch(() =>
        Effect.sync(() => {
          UI.println(
            UI.Style.TEXT_WARNING_BOLD + "MarsbotCode Desktop is not registered yet." + UI.Style.TEXT_NORMAL,
          )
          UI.println("Install or start the desktop app, then try: marsbotcode desktop")
        }),
      ),
    )
  }),
})
