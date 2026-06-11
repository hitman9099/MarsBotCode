import { Button } from "@opencode-ai/ui/button"
import { useDialog } from "@opencode-ai/ui/context/dialog"
import { Dialog } from "@opencode-ai/ui/dialog"
import { Icon } from "@opencode-ai/ui/icon"
import { createMemo, createResource, createSignal, For, Show } from "solid-js"

import { usePlatform, type MarsbotAuditReadOptions } from "@/context/platform"
import { showToast } from "@/utils/toast"
import {
  buildMarsbotPermissionSummary,
  type MarsbotPermissionFilter,
  type MarsbotPermissionRow,
} from "./marsbot-permission-summary"

const FILTERS: Array<{ value: MarsbotPermissionFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "granted", label: "Granted" },
  { value: "rejected", label: "Rejected" },
]

function formatTime(value?: string) {
  if (!value) return "No time"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function decisionLabel(decision: MarsbotPermissionRow["decision"]) {
  if (decision === "granted") return "Granted"
  if (decision === "rejected") return "Rejected"
  return "Pending"
}

function decisionClass(decision: MarsbotPermissionRow["decision"]) {
  return {
    "size-1.5 rounded-full shrink-0": true,
    "bg-icon-success-base": decision === "granted",
    "bg-icon-critical-base": decision === "rejected",
    "bg-icon-warning-base": decision === "pending",
  }
}

function FilterButton(props: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      class="h-8 px-3 rounded-md text-12-regular transition-colors"
      classList={{
        "bg-surface-base-active text-text-base": props.active,
        "text-text-weak hover:bg-surface-base-hover": !props.active,
      }}
      onClick={props.onClick}
    >
      {props.label}
    </button>
  )
}

function PermissionRow(props: { row: MarsbotPermissionRow }) {
  const meta = () =>
    [
      props.row.permission,
      props.row.callID,
      props.row.sessionID,
      `${props.row.source.file}:${props.row.source.line}`,
    ]
      .filter(Boolean)
      .join(" / ")

  return (
    <div class="flex gap-3 rounded-md bg-surface-base px-3 py-2">
      <div class="pt-2">
        <div classList={decisionClass(props.row.decision)} />
      </div>
      <div class="flex min-w-0 flex-1 flex-col">
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0 flex items-center gap-2">
            <div class="text-13-medium text-text-base truncate">{props.row.title}</div>
            <span class="shrink-0 rounded-sm bg-background-base px-1.5 py-0.5 text-11-regular text-text-weak">
              {decisionLabel(props.row.decision)}
            </span>
          </div>
          <div class="shrink-0 text-11-regular text-text-weaker">{formatTime(props.row.time)}</div>
        </div>
        <div class="text-11-regular text-text-weak truncate">{meta()}</div>
        <Show when={props.row.patterns.length > 0}>
          <div class="mt-1 flex flex-wrap gap-1">
            <For each={props.row.patterns.slice(0, 4)}>
              {(pattern) => (
                <code class="max-w-full truncate rounded-sm bg-background-base px-1.5 py-0.5 text-11-regular text-text-weaker">
                  {pattern}
                </code>
              )}
            </For>
          </div>
        </Show>
        <Show when={props.row.summary}>
          <pre class="mt-1 max-h-14 overflow-hidden whitespace-pre-wrap break-words text-11-regular text-text-weaker font-mono">
            {props.row.summary}
          </pre>
        </Show>
      </div>
    </div>
  )
}

export function DialogMarsbotPermissions(props: { directory?: string }) {
  const dialog = useDialog()
  const platform = usePlatform()
  const [query, setQuery] = createSignal("")
  const [decision, setDecision] = createSignal<MarsbotPermissionFilter>("all")
  const [refresh, setRefresh] = createSignal(0)
  const supported = () => !!platform.getMarsbotAudit
  const source = createMemo(() => {
    if (!supported() || !props.directory) return undefined
    return {
      directory: props.directory,
      tick: refresh(),
    }
  })
  const [audit] = createResource(source, (input) => {
    const options: MarsbotAuditReadOptions = {
      limit: 500,
      type: "permission",
    }
    return platform.getMarsbotAudit!(input.directory, options)
  })
  const summary = createMemo(() =>
    buildMarsbotPermissionSummary({
      records: audit.latest?.records ?? [],
      query: query(),
      decision: decision(),
      limit: 200,
    }),
  )

  const openAuditPath = () => {
    const auditPath = audit.latest?.path
    if (!auditPath || !platform.openPath) return
    void platform.openPath(auditPath).catch((error) => {
      showToast({
        variant: "error",
        title: "Open audit directory failed",
        description: error instanceof Error ? error.message : String(error),
      })
    })
  }

  return (
    <Dialog
      title="MarsbotCode Permissions"
      size="large"
      fit
      class="w-[min(calc(100vw-40px),920px)] h-[min(calc(100vh-40px),640px)] min-h-0 overflow-hidden"
      action={
        <Button variant="ghost" size="small" icon="close" onClick={() => dialog.close()}>
          Close
        </Button>
      }
    >
      <div class="flex h-full min-h-0 flex-col gap-3">
        <Show
          when={props.directory}
          fallback={
            <div class="flex flex-1 items-center justify-center text-14-regular text-text-weak">
              Open a project to view MarsbotCode permission decisions.
            </div>
          }
        >
          <Show
            when={supported()}
            fallback={
              <div class="flex flex-1 items-center justify-center text-14-regular text-text-weak">
                MarsbotCode permission center is available in the desktop client.
              </div>
            }
          >
            <div class="flex flex-wrap items-center gap-2">
              <div class="relative min-w-[220px] flex-1">
                <Icon name="magnifying-glass" size="small" class="absolute left-3 top-2 text-icon-weak" />
                <input
                  autofocus
                  class="h-8 w-full rounded-md border border-border-weak-base bg-background-base pl-9 pr-3 text-13-regular text-text-base outline-none focus:border-border-strong-base"
                  placeholder="Search permission, command, session..."
                  value={query()}
                  onInput={(event) => setQuery(event.currentTarget.value)}
                />
              </div>
              <div class="flex h-8 rounded-md bg-surface-base p-0.5">
                <For each={FILTERS}>
                  {(filter) => (
                    <FilterButton
                      active={decision() === filter.value}
                      label={filter.label}
                      onClick={() => setDecision(filter.value)}
                    />
                  )}
                </For>
              </div>
              <Button
                variant="secondary"
                size="small"
                icon="reset"
                class="h-8 px-2"
                onClick={() => setRefresh((value) => value + 1)}
              >
                Refresh
              </Button>
              <Button
                variant="ghost"
                size="small"
                icon="open-file"
                class="h-8 px-2"
                disabled={!audit.latest?.path || !platform.openPath}
                onClick={openAuditPath}
              >
                Open dir
              </Button>
            </div>

            <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div class="rounded-md bg-surface-base px-3 py-2">
                <div class="text-11-regular text-text-weaker">Requests</div>
                <div class="text-16-medium text-text-base">{summary().stats.requests}</div>
              </div>
              <div class="rounded-md bg-surface-base px-3 py-2">
                <div class="text-11-regular text-text-weaker">Granted</div>
                <div class="text-16-medium text-text-base">{summary().stats.granted}</div>
              </div>
              <div class="rounded-md bg-surface-base px-3 py-2">
                <div class="text-11-regular text-text-weaker">Rejected</div>
                <div class="text-16-medium text-text-base">{summary().stats.rejected}</div>
              </div>
              <div class="rounded-md bg-surface-base px-3 py-2">
                <div class="text-11-regular text-text-weaker">Pending</div>
                <div class="text-16-medium text-text-base">{summary().stats.pending}</div>
              </div>
            </div>

            <div class="flex min-h-0 flex-1 flex-col rounded-md bg-background-base p-2">
              <Show
                when={!audit.error}
                fallback={
                  <div class="flex h-full items-center justify-center text-14-regular text-text-weak">
                    MarsbotCode permission records could not be loaded.
                  </div>
                }
              >
                <Show
                  when={!audit.loading}
                  fallback={
                    <div class="flex h-full items-center justify-center text-14-regular text-text-weak">
                      Loading permission records...
                    </div>
                  }
                >
                  <Show
                    when={audit.latest?.enabled}
                    fallback={
                      <div class="flex h-full items-center justify-center text-14-regular text-text-weak">
                        Audit logging is disabled for this project.
                      </div>
                    }
                  >
                    <div class="mb-2 flex items-center justify-between gap-2 px-1 text-11-regular text-text-weak">
                      <span>{summary().filtered} matched</span>
                      <span>{summary().returned} shown</span>
                    </div>
                    <div class="min-h-0 flex-1 overflow-y-auto">
                      <For
                        each={summary().rows}
                        fallback={
                          <div class="flex h-full items-center justify-center text-14-regular text-text-weak">
                            No permission records matched the current filters.
                          </div>
                        }
                      >
                        {(row) => <PermissionRow row={row} />}
                      </For>
                    </div>
                  </Show>
                </Show>
              </Show>
            </div>
          </Show>
        </Show>
      </div>
    </Dialog>
  )
}
