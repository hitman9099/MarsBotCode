import { Button } from "@opencode-ai/ui/button"
import { useDialog } from "@opencode-ai/ui/context/dialog"
import { Dialog } from "@opencode-ai/ui/dialog"
import { Icon } from "@opencode-ai/ui/icon"
import { createMemo, For, Show } from "solid-js"

import {
  buildMarsbotWorkbenchSummary,
  type MarsbotWorkbenchModuleStatus,
  type MarsbotWorkbenchSession,
  type MarsbotWorkbenchSummaryInput,
} from "./marsbot-workbench-summary"

type DialogMarsbotWorkbenchProps = {
  directory?: string
  activeSessionID?: string
  sessions: MarsbotWorkbenchSession[]
  fileTreeOpen: boolean
  terminalOpen: boolean
  insights?: MarsbotWorkbenchSummaryInput["insights"]
  onOpenHome: () => void
  onNewSession: () => void
  onOpenSession: (id: string) => void
  onOpenFileTree: () => void
  onToggleTerminal: () => void
  onViewPermissions: () => void
  onViewAudit: () => void
}

const MODULE_ICON = {
  project: "folder",
  agent: "new-session",
  sessions: "bullet-list",
  files: "file-tree",
  terminal: "terminal",
  sandbox: "shield",
  audit: "review",
} as const

function statusLabel(status: MarsbotWorkbenchModuleStatus) {
  if (status === "ready") return "Ready"
  if (status === "warning") return "Check"
  if (status === "inactive") return "Off"
  return "Blocked"
}

function statusClass(status: MarsbotWorkbenchModuleStatus) {
  return {
    "size-1.5 rounded-full shrink-0": true,
    "bg-icon-success-base": status === "ready",
    "bg-icon-warning-base": status === "warning",
    "bg-border-weak-base": status === "inactive",
    "bg-icon-critical-base": status === "blocked",
  }
}

function sessionTitle(session: MarsbotWorkbenchSession) {
  return session.title?.trim() || "Untitled session"
}

function runAndClose(dialog: ReturnType<typeof useDialog>, action: () => void) {
  action()
  dialog.close()
}

export function DialogMarsbotWorkbench(props: DialogMarsbotWorkbenchProps) {
  const dialog = useDialog()
  const summary = createMemo(() =>
    buildMarsbotWorkbenchSummary({
      directory: props.directory,
      sessions: props.sessions,
      fileTreeOpen: props.fileTreeOpen,
      terminalOpen: props.terminalOpen,
      insights: props.insights,
    }),
  )
  const hasProject = () => !!summary().directory

  return (
    <Dialog
      title="MarsbotCode Workbench"
      size="large"
      fit
      class="w-[min(calc(100vw-40px),920px)] h-[min(calc(100vh-40px),640px)] min-h-0 overflow-hidden"
      action={
        <Button variant="ghost" size="small" icon="close" onClick={() => dialog.close()}>
          Close
        </Button>
      }
    >
      <div class="flex min-h-0 h-full flex-col gap-3">
        <div class="flex flex-wrap items-center justify-between gap-3 rounded-md bg-background-base px-4 py-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2 min-w-0">
              <Icon name="folder" size="small" class="text-icon-weak shrink-0" />
              <div class="text-16-medium text-text-base truncate">{summary().projectName}</div>
            </div>
            <div class="mt-1 text-12-regular text-text-weak truncate">
              {summary().directory ?? "No local project selected"}
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2 shrink-0">
            <Button variant="secondary" size="small" icon="new-session" disabled={!hasProject()} onClick={() => runAndClose(dialog, props.onNewSession)}>
              New session
            </Button>
            <Button variant="ghost" size="small" icon="folder" onClick={() => runAndClose(dialog, props.onOpenHome)}>
              Open home
            </Button>
          </div>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
          <For each={summary().metrics}>
            {(metric) => (
              <div class="rounded-md bg-surface-base px-3 py-2">
                <div class="text-11-regular text-text-weaker">{metric.label}</div>
                <div class="text-16-medium text-text-base truncate">{metric.value}</div>
              </div>
            )}
          </For>
        </div>

        <div class="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)] gap-3">
          <div class="min-h-0 overflow-y-auto rounded-md bg-background-base p-3">
            <div class="mb-2 text-12-semibold text-text-base">Modules</div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <For each={summary().modules}>
                {(module) => (
                  <div class="flex min-h-[88px] gap-3 rounded-md bg-surface-base px-3 py-3">
                    <div class="flex size-8 shrink-0 items-center justify-center rounded-md bg-background-base">
                      <Icon name={MODULE_ICON[module.id]} size="small" class="text-icon-base" />
                    </div>
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center justify-between gap-2">
                        <div class="text-13-medium text-text-base truncate">{module.label}</div>
                        <div class="flex items-center gap-1 shrink-0">
                          <div classList={statusClass(module.status)} />
                          <span class="text-11-regular text-text-weak">{statusLabel(module.status)}</span>
                        </div>
                      </div>
                      <div class="mt-1 line-clamp-2 text-12-regular text-text-weak">{module.detail}</div>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </div>

          <div class="min-h-0 overflow-hidden rounded-md bg-background-base p-3 flex flex-col">
            <div class="mb-2 flex items-center justify-between gap-2">
              <div class="text-12-semibold text-text-base">Recent sessions</div>
              <span class="text-11-regular text-text-weak">{summary().recentSessions.length}</span>
            </div>
            <div class="min-h-0 flex-1 overflow-y-auto">
              <For
                each={summary().recentSessions}
                fallback={
                  <div class="flex h-full items-center justify-center text-13-regular text-text-weak">
                    {hasProject() ? "No sessions yet." : "Open a project to load sessions."}
                  </div>
                }
              >
                {(session) => (
                  <button
                    type="button"
                    class="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-surface-base-hover"
                    onClick={() => runAndClose(dialog, () => props.onOpenSession(session.id))}
                  >
                    <div classList={statusClass(session.id === props.activeSessionID ? "ready" : "inactive")} />
                    <div class="min-w-0 flex-1">
                      <div class="text-13-regular text-text-base truncate">{sessionTitle(session)}</div>
                      <div class="text-11-regular text-text-weak truncate">{session.id}</div>
                    </div>
                    <Icon name="chevron-right" size="small" class="text-icon-weak shrink-0" />
                  </button>
                )}
              </For>
            </div>
            <div class="mt-3 grid grid-cols-1 gap-2">
              <Button variant="secondary" size="small" icon="file-tree" disabled={!hasProject()} onClick={() => runAndClose(dialog, props.onOpenFileTree)}>
                Open file tree
              </Button>
              <Button variant="secondary" size="small" icon="terminal" disabled={!hasProject()} onClick={() => runAndClose(dialog, props.onToggleTerminal)}>
                Toggle terminal
              </Button>
              <Button variant="ghost" size="small" icon="checklist" disabled={!hasProject()} onClick={() => runAndClose(dialog, props.onViewPermissions)}>
                Permissions
              </Button>
              <Button variant="ghost" size="small" icon="review" disabled={!hasProject()} onClick={() => runAndClose(dialog, props.onViewAudit)}>
                View audit log
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  )
}
