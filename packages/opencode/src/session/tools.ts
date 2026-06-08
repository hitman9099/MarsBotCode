import { Agent } from "@/agent/agent"
import { SessionV1 } from "@opencode-ai/core/v1/session"
import { Provider } from "@/provider/provider"
import { ProviderTransform } from "@/provider/transform"
import { MCP } from "@/mcp"
import { Permission } from "@/permission"
import { Tool } from "@/tool/tool"
import { ToolJsonSchema } from "@/tool/json-schema"
import { ToolRegistry } from "@/tool/registry"
import { Truncate } from "@/tool/truncate"

import { Plugin } from "@/plugin"
import { Config } from "@/config/config"
import * as MarsbotAudit from "@/marsbot/audit"
import type { TaskPromptOps } from "@/tool/task"
import { type Tool as AITool, tool, jsonSchema, type ToolExecutionOptions, asSchema } from "ai"
import { Cause, Effect } from "effect"
import { MessageV2 } from "./message-v2"
import { Session } from "./session"
import { SessionProcessor } from "./processor"
import { PartID } from "./schema"
import { Log } from "@opencode-ai/core/util/log"
import { EffectBridge } from "@/effect/bridge"
import { ProviderV2 } from "@opencode-ai/core/provider"
import { ModelV2 } from "@opencode-ai/core/model"

const log = Log.create({ service: "session.tools" })

export const resolve = Effect.fn("SessionTools.resolve")(function* (input: {
  agent: Agent.Info
  model: Provider.Model
  session: Session.Info
  processor: Pick<SessionProcessor.Handle, "message" | "updateToolCall" | "completeToolCall">
  bypassAgentCheck: boolean
  messages: SessionV1.WithParts[]
  promptOps: TaskPromptOps
}) {
  using _ = log.time("resolveTools")
  const tools: Record<string, AITool> = {}
  const run = yield* EffectBridge.make()
  const plugin = yield* Plugin.Service
  const permission = yield* Permission.Service
  const registry = yield* ToolRegistry.Service
  const mcp = yield* MCP.Service
  const truncate = yield* Truncate.Service
  const config = yield* Config.Service
  const cfg = yield* config.get()

  const writeAudit = (
    record: Omit<MarsbotAudit.AuditRecord, "sessionID" | "messageID" | "directory" | "agent" | "model">,
  ) =>
    Effect.promise(() =>
      MarsbotAudit.write({
        config: cfg.audit,
        directory: input.session.directory,
        record: {
          ...record,
          sessionID: input.session.id,
          messageID: input.processor.message.id,
          agent: input.agent.name,
          model: {
            providerID: String(input.model.providerID),
            id: String(input.model.api.id),
          },
          directory: input.session.directory,
        },
      }),
    ).pipe(Effect.catch((error) => Effect.sync(() => log.warn("MarsbotCode audit write failed", { error }))))

  const permissionAuditData = (req: Parameters<Tool.Context["ask"]>[0]) =>
    MarsbotAudit.permission({
      permission: req.permission,
      patterns: req.patterns,
      always: req.always,
      metadata: req.metadata,
    })

  const context = (args: Record<string, unknown>, options: ToolExecutionOptions): Tool.Context => ({
    sessionID: input.session.id,
    abort: options.abortSignal!,
    messageID: input.processor.message.id,
    callID: options.toolCallId,
    extra: { model: input.model, bypassAgentCheck: input.bypassAgentCheck, promptOps: input.promptOps },
    agent: input.agent.name,
    messages: input.messages,
    metadata: (val) =>
      input.processor.updateToolCall(options.toolCallId, (match) => {
        if (!["running", "pending"].includes(match.state.status)) return match
        return {
          ...match,
          state: {
            title: val.title,
            metadata: val.metadata,
            status: "running",
            input: args,
            time: { start: Date.now() },
          },
        }
      }),
    ask: (req) =>
      Effect.gen(function* () {
        const request = {
          ...req,
          sessionID: input.session.id,
          tool: { messageID: input.processor.message.id, callID: options.toolCallId },
          ruleset: Permission.merge(input.agent.permission, input.session.permission ?? []),
        }
        yield* writeAudit({
          type: "permission",
          phase: "permission.request",
          tool: req.permission,
          callID: options.toolCallId,
          data: permissionAuditData(req),
        })
        yield* permission.ask(request).pipe(
          Effect.tap(() =>
            writeAudit({
              type: "permission",
              phase: "permission.granted",
              tool: req.permission,
              callID: options.toolCallId,
              data: permissionAuditData(req),
            }),
          ),
          Effect.catch((error) =>
            writeAudit({
              type: "permission",
              phase: "permission.rejected",
              tool: req.permission,
              callID: options.toolCallId,
              data: {
                request: permissionAuditData(req),
                error: MarsbotAudit.error(error),
              },
            }).pipe(Effect.flatMap(() => Effect.fail(error))),
          ),
          Effect.orDie,
        )
      }),
  })

  for (const item of yield* registry.tools({
    modelID: ModelV2.ID.make(input.model.api.id),
    providerID: input.model.providerID,
    agent: input.agent,
  })) {
    const schema = ProviderTransform.schema(input.model, ToolJsonSchema.fromTool(item))
    tools[item.id] = tool({
      description: item.description,
      inputSchema: jsonSchema(schema),
      execute(args, options) {
        return run.promise(
          Effect.gen(function* () {
            const ctx = context(args, options)
            yield* plugin.trigger(
              "tool.execute.before",
              { tool: item.id, sessionID: ctx.sessionID, callID: ctx.callID },
              { args },
            )
            yield* writeAudit({
              type: "tool",
              phase: "tool.before",
              tool: item.id,
              callID: ctx.callID,
              data: {
                args: MarsbotAudit.toolArgs(item.id, args),
              },
            })
            const result = yield* item.execute(args, ctx).pipe(
              Effect.catchCause((cause) =>
                writeAudit({
                  type: "tool",
                  phase: "tool.error",
                  tool: item.id,
                  callID: ctx.callID,
                  data: {
                    args: MarsbotAudit.toolArgs(item.id, args),
                    error: MarsbotAudit.error(Cause.pretty(cause)),
                  },
                }).pipe(Effect.flatMap(() => Effect.failCause(cause))),
              ),
            )
            const output = {
              ...result,
              attachments: result.attachments?.map((attachment) => ({
                ...attachment,
                id: PartID.ascending(),
                sessionID: ctx.sessionID,
                messageID: input.processor.message.id,
              })),
            }
            yield* plugin.trigger(
              "tool.execute.after",
              { tool: item.id, sessionID: ctx.sessionID, callID: ctx.callID, args },
              output,
            )
            yield* writeAudit({
              type: "tool",
              phase: "tool.after",
              tool: item.id,
              callID: ctx.callID,
              data: {
                output: MarsbotAudit.toolOutput(output),
              },
            })
            if (options.abortSignal?.aborted) {
              yield* input.processor.completeToolCall(options.toolCallId, output)
            }
            return output
          }),
        )
      },
    })
  }

  for (const [key, item] of Object.entries(yield* mcp.tools())) {
    const execute = item.execute
    if (!execute) continue

    const schema = yield* Effect.promise(() => Promise.resolve(asSchema(item.inputSchema).jsonSchema))
    const transformed = ProviderTransform.schema(input.model, schema)
    item.inputSchema = jsonSchema(transformed)
    item.execute = (args, opts) =>
      run.promise(
        Effect.gen(function* () {
          const ctx = context(args, opts)
          yield* plugin.trigger(
            "tool.execute.before",
            { tool: key, sessionID: ctx.sessionID, callID: opts.toolCallId },
            { args },
          )
          yield* writeAudit({
            type: "tool",
            phase: "tool.before",
            tool: key,
            callID: opts.toolCallId,
            data: {
              args: MarsbotAudit.toolArgs(key, args),
            },
          })
          const result: Awaited<ReturnType<NonNullable<typeof execute>>> = yield* Effect.gen(function* () {
            yield* ctx.ask({ permission: key, metadata: {}, patterns: ["*"], always: ["*"] })
            return yield* Effect.promise(() => execute(args, opts))
          }).pipe(
            Effect.catchCause((cause) =>
              writeAudit({
                type: "tool",
                phase: "tool.error",
                tool: key,
                callID: opts.toolCallId,
                data: {
                  args: MarsbotAudit.toolArgs(key, args),
                  error: MarsbotAudit.error(Cause.pretty(cause)),
                },
              }).pipe(Effect.flatMap(() => Effect.failCause(cause))),
            ),
            Effect.withSpan("Tool.execute", {
              attributes: {
                "tool.name": key,
                "tool.call_id": opts.toolCallId,
                "session.id": ctx.sessionID,
                "message.id": input.processor.message.id,
              },
            }),
          )
          yield* plugin.trigger(
            "tool.execute.after",
            { tool: key, sessionID: ctx.sessionID, callID: opts.toolCallId, args },
            result,
          )

          const textParts: string[] = []
          const attachments: Omit<SessionV1.FilePart, "id" | "sessionID" | "messageID">[] = []
          for (const contentItem of result.content) {
            if (contentItem.type === "text") textParts.push(contentItem.text)
            else if (contentItem.type === "image") {
              attachments.push({
                type: "file",
                mime: contentItem.mimeType,
                url: `data:${contentItem.mimeType};base64,${contentItem.data}`,
              })
            } else if (contentItem.type === "resource") {
              const { resource } = contentItem
              if (resource.text) textParts.push(resource.text)
              if (resource.blob) {
                attachments.push({
                  type: "file",
                  mime: resource.mimeType ?? "application/octet-stream",
                  url: `data:${resource.mimeType ?? "application/octet-stream"};base64,${resource.blob}`,
                  filename: resource.uri,
                })
              }
            }
          }

          const truncated = yield* truncate.output(textParts.join("\n\n"), {}, input.agent)
          const metadata = {
            ...result.metadata,
            truncated: truncated.truncated,
            ...(truncated.truncated && { outputPath: truncated.outputPath }),
          }

          const output = {
            title: "",
            metadata,
            output: truncated.content,
            attachments: attachments.map((attachment) => ({
              ...attachment,
              id: PartID.ascending(),
              sessionID: ctx.sessionID,
              messageID: input.processor.message.id,
            })),
            content: result.content,
          }
          yield* writeAudit({
            type: "tool",
            phase: "tool.after",
            tool: key,
            callID: opts.toolCallId,
            data: {
              output: MarsbotAudit.toolOutput(output),
            },
          })
          if (opts.abortSignal?.aborted) {
            yield* input.processor.completeToolCall(opts.toolCallId, output)
          }
          return output
        }),
      )
    tools[key] = item
  }

  return tools
})

export * as SessionTools from "./tools"
