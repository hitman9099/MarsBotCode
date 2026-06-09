export type MarsbotWorkbenchSession = {
  id: string
  title?: string
  updated?: number
  created?: number
}

type MarsbotWorkbenchInsights = {
  sandbox?: {
    status?: "disabled" | "active" | "weak" | "unavailable"
    message?: string
  }
  audit?: {
    enabled?: boolean
    records?: unknown[]
  }
}

export type MarsbotWorkbenchModuleStatus = "ready" | "warning" | "inactive" | "blocked"

export type MarsbotWorkbenchModule = {
  id: "project" | "agent" | "sessions" | "files" | "terminal" | "sandbox" | "audit"
  label: string
  status: MarsbotWorkbenchModuleStatus
  detail: string
}

export type MarsbotWorkbenchMetric = {
  label: string
  value: string
}

export type MarsbotWorkbenchSummary = {
  directory?: string
  projectName: string
  metrics: MarsbotWorkbenchMetric[]
  modules: MarsbotWorkbenchModule[]
  recentSessions: MarsbotWorkbenchSession[]
}

export type MarsbotWorkbenchSummaryInput = {
  directory?: string
  sessions: MarsbotWorkbenchSession[]
  fileTreeOpen: boolean
  terminalOpen: boolean
  insights?: MarsbotWorkbenchInsights
}

type MarsbotSandboxStatus = NonNullable<MarsbotWorkbenchInsights["sandbox"]>["status"]

const statusLabel = (status: MarsbotSandboxStatus | undefined) => {
  if (status === "active") return "Active"
  if (status === "weak") return "Weak"
  if (status === "unavailable") return "Unavailable"
  if (status === "disabled") return "Disabled"
  return "Unknown"
}

function projectName(directory?: string) {
  if (!directory) return "No project"
  const normalized = directory.replace(/[\\/]+$/, "")
  return normalized.split(/[\\/]/).filter(Boolean).pop() || directory
}

function sessionTime(session: MarsbotWorkbenchSession) {
  return session.updated ?? session.created ?? 0
}

function sandboxModule(input: MarsbotWorkbenchSummaryInput): MarsbotWorkbenchModule {
  if (!input.directory) {
    return {
      id: "sandbox",
      label: "Sandbox",
      status: "blocked",
      detail: "Open a project to inspect sandbox status.",
    }
  }

  const sandbox = input.insights?.sandbox
  if (!sandbox?.status) {
    return {
      id: "sandbox",
      label: "Sandbox",
      status: "warning",
      detail: "Sandbox status has not loaded yet.",
    }
  }

  if (sandbox.status === "active") {
    return {
      id: "sandbox",
      label: "Sandbox",
      status: "ready",
      detail: sandbox.message || "OS sandbox wrapper is active.",
    }
  }

  if (sandbox.status === "weak" || sandbox.status === "unavailable") {
    return {
      id: "sandbox",
      label: "Sandbox",
      status: "warning",
      detail: sandbox.message || "Sandbox needs attention.",
    }
  }

  return {
    id: "sandbox",
    label: "Sandbox",
    status: "inactive",
    detail: sandbox.message || "Sandbox is disabled.",
  }
}

function auditModule(input: MarsbotWorkbenchSummaryInput): MarsbotWorkbenchModule {
  if (!input.directory) {
    return {
      id: "audit",
      label: "Audit",
      status: "blocked",
      detail: "Open a project to inspect audit records.",
    }
  }

  if (input.insights?.audit?.enabled) {
    const count = input.insights.audit.records?.length ?? 0
    return {
      id: "audit",
      label: "Audit",
      status: "ready",
      detail: count > 0 ? `${count} recent audit records loaded.` : "Audit is enabled.",
    }
  }

  return {
    id: "audit",
    label: "Audit",
    status: "inactive",
    detail: "Audit logging is disabled or not configured.",
  }
}

export function buildMarsbotWorkbenchSummary(input: MarsbotWorkbenchSummaryInput): MarsbotWorkbenchSummary {
  const hasProject = !!input.directory
  const recentSessions = input.sessions
    .slice()
    .sort((a, b) => sessionTime(b) - sessionTime(a))
    .slice(0, 6)
  const sandbox = statusLabel(input.insights?.sandbox?.status)

  return {
    directory: input.directory,
    projectName: projectName(input.directory),
    metrics: [
      { label: "Sessions", value: String(input.sessions.length) },
      { label: "File tree", value: input.fileTreeOpen ? "Open" : "Closed" },
      { label: "Terminal", value: input.terminalOpen ? "Open" : "Closed" },
      { label: "Sandbox", value: sandbox },
    ],
    modules: [
      {
        id: "project",
        label: "Project",
        status: hasProject ? "ready" : "blocked",
        detail: hasProject ? input.directory! : "Open a local project to start the desktop workbench.",
      },
      {
        id: "agent",
        label: "Agent Chat",
        status: hasProject ? "ready" : "blocked",
        detail: hasProject ? "Create or continue a session from this project." : "Agent chat needs a project context.",
      },
      {
        id: "sessions",
        label: "Sessions",
        status: hasProject ? (input.sessions.length > 0 ? "ready" : "warning") : "blocked",
        detail: hasProject
          ? input.sessions.length > 0
            ? `${input.sessions.length} sessions available.`
            : "No sessions yet; start a new one."
          : "Open a project to load sessions.",
      },
      {
        id: "files",
        label: "Files",
        status: hasProject ? (input.fileTreeOpen ? "ready" : "inactive") : "blocked",
        detail: hasProject
          ? input.fileTreeOpen
            ? "File tree is visible."
            : "File tree is available but hidden."
          : "Open a project to browse files.",
      },
      {
        id: "terminal",
        label: "Terminal",
        status: hasProject ? (input.terminalOpen ? "ready" : "inactive") : "blocked",
        detail: hasProject
          ? input.terminalOpen
            ? "Terminal panel is open."
            : "Terminal panel is available but hidden."
          : "Open a project to use the terminal.",
      },
      sandboxModule(input),
      auditModule(input),
    ],
    recentSessions,
  }
}
