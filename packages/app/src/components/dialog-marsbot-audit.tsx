import { Button } from "@opencode-ai/ui/button"
import { useDialog } from "@opencode-ai/ui/context/dialog"
import { Dialog } from "@opencode-ai/ui/dialog"
import { Icon } from "@opencode-ai/ui/icon"
import { createMemo, createResource, createSignal, For, Show } from "solid-js"

import { usePlatform, type MarsbotAuditLogRecord, type MarsbotAuditReadOptions } from "@/context/platform"
import { showToast } from "@/utils/toast"

type AuditType = "all" | "tool" | "permission" | "shell"

const FILTERS: Array<{ value: AuditType; label: string }> = [
  { value: "all", label: "All" },
  { value: "tool", label: "Tool" },
  { value: "permission", label: "Permission" },
  { value: "shell", label: "Shell" },
]

function formatTime(value?: string) {
  if (!value) return "No time"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function eventKind(record: MarsbotAuditLogRecord) {
  return record.phase ?? record.type ?? "audit"
}

function dotClass(record: MarsbotAuditLogRecord) {
  const kind = eventKind(record)
  return {
    "size-1.5 rounded-full shrink-0": true,
    "bg-icon-success-base": kind.includes("granted") || kind.includes("after"),
    "bg-icon-warning-base": kind.includes("request") || kind.includes("before"),
    "bg-icon-critical-base": kind.includes("error") || kind.includes("denied"),
    "bg-border-weak-base":
      !kind.includes("granted") &&
      !kind.includes("after") &&
      !kind.includes("request") &&
      !kind.includes("before") &&
      !kind.includes("error") &&
      !kind.includes("denied"),
  }
}

function recordMeta(record: MarsbotAuditLogRecord) {
  return [eventKind(record), record.tool, `${record.source.file}:${record.source.line}`].filter(Boolean).join(" / ")
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

function AuditRecordRow(props: { record: MarsbotAuditLogRecord }) {
  const summary = () => props.record.summary.trim()

  return (
    <div class="flex gap-3 rounded-md bg-surface-base px-3 py-2">
      <div class="pt-2">
        <div classList={dotClass(props.record)} />
      </div>
      <div class="flex flex-col min-w-0 flex-1">
        <div class="flex items-center justify-between gap-3">
          <div class="text-13-medium text-text-base truncate">{props.record.title}</div>
          <div class="text-11-regular text-text-weaker shrink-0">{formatTime(props.record.time)}</div>
        </div>
        <div class="text-11-regular text-text-weak truncate">{recordMeta(props.record)}</div>
        <Show when={summary()}>
          <pre class="mt-1 max-h-16 overflow-hidden whitespace-pre-wrap break-words text-11-regular text-text-weaker font-mono">
            {summary()}
          </pre>
        </Show>
      </div>
    </div>
  )
}

export function DialogMarsbotAudit(props: { directory?: string }) {
  const dialog = useDialog()
  const platform = usePlatform()
  const [query, setQuery] = createSignal("")
  const [type, setType] = createSignal<AuditType>("all")
  const [refresh, setRefresh] = createSignal(0)
  const supported = () => !!platform.getMarsbotAudit
  const source = createMemo(() => {
    if (!supported() || !props.directory) return undefined
    return {
      directory: props.directory,
      query: query().trim(),
      type: type(),
      tick: refresh(),
    }
  })
  const [audit] = createResource(source, (input) => {
    const options: MarsbotAuditReadOptions = {
      limit: 200,
      query: input.query || undefined,
      type: input.type,
    }
    return platform.getMarsbotAudit!(input.directory, options)
  })

  const openAuditPath = () => {
    const path = audit.latest?.path
    if (!path || !platform.openPath) return
    void platform.openPath(path).catch((error) => {
      showToast({
        variant: "error",
        title: "Open audit directory failed",
        description: error instanceof Error ? error.message : String(error),
      })
    })
  }

  return (
    <Dialog
      title="MarsbotCode Audit"
      size="large"
      fit
      class="w-[min(calc(100vw-40px),920px)] h-[min(calc(100vh-40px),620px)] min-h-0 overflow-hidden"
      action={
        <Button variant="ghost" size="small" icon="close" onClick={() => dialog.close()}>
          Close
        </Button>
      }
    >
      <div class="flex flex-col min-h-0 h-full gap-3">
        <Show
          when={props.directory}
          fallback={
            <div class="flex flex-1 items-center justify-center text-14-regular text-text-weak">
              Open a project to view MarsbotCode audit records.
            </div>
          }
        >
          <Show
            when={supported()}
            fallback={
              <div class="flex flex-1 items-center justify-center text-14-regular text-text-weak">
                MarsbotCode audit viewer is available in the desktop client.
              </div>
            }
          >
            <div class="flex flex-wrap items-center gap-2">
              <div class="relative flex-1 min-w-[220px]">
                <Icon name="magnifying-glass" size="small" class="absolute left-3 top-2 text-icon-weak" />
                <input
                  autofocus
                  class="w-full h-8 rounded-md border border-border-weak-base bg-background-base pl-9 pr-3 text-13-regular text-text-base outline-none focus:border-border-strong-base"
                  placeholder="Search command, tool, permission, session..."
                  value={query()}
                  onInput={(event) => setQuery(event.currentTarget.value)}
                />
              </div>
              <div class="flex h-8 rounded-md bg-surface-base p-0.5">
                <For each={FILTERS}>
                  {(filter) => (
                    <FilterButton
                      active={type() === filter.value}
                      label={filter.label}
                      onClick={() => setType(filter.value)}
                    />
                  )}
                </For>
              </div>
              <Button variant="secondary" size="small" icon="reset" class="h-8 px-2" onClick={() => setRefresh((value) => value + 1)}>
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

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div class="rounded-md bg-surface-base px-3 py-2">
                <div class="text-11-regular text-text-weaker">Matched</div>
                <div class="text-16-medium text-text-base">{audit.latest?.total ?? 0}</div>
              </div>
              <div class="rounded-md bg-surface-base px-3 py-2">
                <div class="text-11-regular text-text-weaker">Shown</div>
                <div class="text-16-medium text-text-base">{audit.latest?.returned ?? 0}</div>
              </div>
              <div class="rounded-md bg-surface-base px-3 py-2">
                <div class="text-11-regular text-text-weaker">Skipped</div>
                <div class="text-16-medium text-text-base">{audit.latest?.skipped ?? 0}</div>
              </div>
              <div class="rounded-md bg-surface-base px-3 py-2 min-w-0">
                <div class="text-11-regular text-text-weaker">Audit</div>
                <div class="text-12-regular text-text-base truncate">
                  {audit.latest?.enabled ? audit.latest.path : "Disabled"}
                </div>
              </div>
            </div>

            <div class="flex-1 min-h-0 overflow-y-auto rounded-md bg-background-base p-2">
              <Show
                when={!audit.error}
                fallback={
                  <div class="flex h-full items-center justify-center text-14-regular text-text-weak">
                    MarsbotCode audit records could not be loaded.
                  </div>
                }
              >
                <Show
                  when={!audit.loading}
                  fallback={
                    <div class="flex h-full items-center justify-center text-14-regular text-text-weak">
                      Loading audit records...
                    </div>
                  }
                >
                  <For
                    each={audit.latest?.records ?? []}
                    fallback={
                      <div class="flex h-full items-center justify-center text-14-regular text-text-weak">
                        No audit records matched the current filters.
                      </div>
                    }
                  >
                    {(record) => <AuditRecordRow record={record} />}
                  </For>
                </Show>
              </Show>
            </div>
          </Show>
        </Show>
      </div>
    </Dialog>
  )
}
