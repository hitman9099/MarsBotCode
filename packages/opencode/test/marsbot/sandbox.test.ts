import { describe, expect, test } from "bun:test"
import * as MarsbotSandbox from "../../src/marsbot/sandbox"

const config: MarsbotSandbox.SandboxConfig = {
  enabled: true,
  mode: "os",
  denyRead: ["~/.ssh", "~/.npmrc"],
  allowWrite: ["./", "/tmp"],
  allowedDomains: ["github.com"],
}

describe("MarsbotSandbox", () => {
  test("returns disabled status when sandbox config is off", () => {
    const plan = MarsbotSandbox.plan({
      config: { enabled: true, mode: "off" },
      platform: "linux",
      exists: () => true,
      shell: "/bin/bash",
      shellArgs: ["-lc", "echo off"],
      cwd: "/repo",
    })

    expect(plan.command).toBeUndefined()
    expect(plan.status).toMatchObject({
      enabled: false,
      mode: "off",
      status: "disabled",
      wrapped: false,
    })
  })

  test("reports weak mode on Windows without wrapping the command", () => {
    const plan = MarsbotSandbox.plan({
      config,
      platform: "win32",
      shell: "powershell.exe",
      shellArgs: ["-Command", "echo weak"],
      cwd: "C:/repo",
    })

    expect(plan.command).toBeUndefined()
    expect(plan.status).toMatchObject({
      enabled: true,
      mode: "os",
      platform: "win32",
      status: "weak",
      engine: "none",
      wrapped: false,
    })
  })

  test("builds a bubblewrap execution plan on Linux when available", () => {
    const plan = MarsbotSandbox.plan({
      config,
      platform: "linux",
      exists: (command) => command === "bwrap",
      stat: (file) => {
        if (["/repo", "/tmp", "/home/test/.ssh"].includes(file)) return "dir"
        if (file === "/home/test/.npmrc") return "file"
        return undefined
      },
      home: "/home/test",
      shell: "/bin/bash",
      shellArgs: ["-lc", "echo active"],
      cwd: "/repo",
    })

    expect(plan.status).toMatchObject({
      enabled: true,
      platform: "linux",
      status: "active",
      engine: "bubblewrap",
      wrapped: true,
    })
    expect(plan.command).toBe("bwrap")
    expect(plan.args).toContain("--ro-bind")
    expect(plan.args).toContain("--bind")
    expect(plan.args).toContain("--tmpfs")
    expect(plan.args).toContain("/bin/bash")
    expect(plan.status.warnings).toContain("OS sandbox mode cannot enforce per-domain network rules yet")
  })

  test("builds a sandbox-exec execution plan on macOS when available", () => {
    const plan = MarsbotSandbox.plan({
      config,
      platform: "darwin",
      exists: (command) => command === "sandbox-exec",
      home: "/Users/test",
      shell: "/bin/zsh",
      shellArgs: ["-lc", "echo active"],
      cwd: "/repo",
    })

    expect(plan.status).toMatchObject({
      enabled: true,
      platform: "darwin",
      status: "active",
      engine: "seatbelt",
      wrapped: true,
    })
    expect(plan.command).toBe("sandbox-exec")
    expect(plan.args?.[0]).toBe("-p")
    expect(plan.args?.[1]).toContain('(deny file-read* (subpath "/Users/test/.ssh"))')
    expect(plan.args).toContain("/bin/zsh")
  })

  test("doctor rows include configuration and network limitations", () => {
    const rows = MarsbotSandbox.doctorRows({
      config,
      platform: "linux",
      exists: () => false,
    })

    expect(rows).toContainEqual(["Config", "enabled (os)"])
    expect(rows).toContainEqual(["OS sandbox", "missing: install bubblewrap"])
    expect(rows).toContainEqual(["Network rules", "configured, but per-domain enforcement is not available in OS mode yet"])
  })
})
