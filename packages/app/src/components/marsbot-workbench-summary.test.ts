import { describe, expect, test } from "bun:test"

import { buildMarsbotWorkbenchSummary } from "./marsbot-workbench-summary"

describe("buildMarsbotWorkbenchSummary", () => {
  test("reports empty project state when no directory is selected", () => {
    const result = buildMarsbotWorkbenchSummary({
      directory: undefined,
      sessions: [],
      fileTreeOpen: false,
      terminalOpen: false,
      insights: undefined,
    })

    expect(result.projectName).toBe("No project")
    expect(result.metrics).toEqual([
      { label: "Sessions", value: "0" },
      { label: "File tree", value: "Closed" },
      { label: "Terminal", value: "Closed" },
      { label: "Sandbox", value: "Unknown" },
    ])
    expect(result.modules.find((item) => item.id === "project")?.status).toBe("blocked")
  })

  test("summarizes ready workbench modules for an active project", () => {
    const result = buildMarsbotWorkbenchSummary({
      directory: "E:/repo/app",
      sessions: [
        { id: "ses_1", title: "Older task", updated: 10 },
        { id: "ses_2", title: "Fix checkout", updated: 20 },
      ],
      fileTreeOpen: true,
      terminalOpen: true,
      insights: {
        sandbox: { status: "weak", message: "Windows weak mode" },
        audit: { enabled: true, records: [{ phase: "tool.after" }] },
      },
    })

    expect(result.projectName).toBe("app")
    expect(result.recentSessions.map((item) => item.id)).toEqual(["ses_2", "ses_1"])
    expect(result.modules.map((item) => [item.id, item.status])).toContainEqual(["audit", "ready"])
    expect(result.modules.map((item) => [item.id, item.status])).toContainEqual(["sandbox", "warning"])
  })
})
