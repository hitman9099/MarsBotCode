import { EventV2 } from "@opencode-ai/core/event"
import { Location } from "@opencode-ai/core/location"
import { Effect, Stream } from "effect"
import { HttpServerResponse } from "effect/unstable/http"
import { HttpApiBuilder } from "effect/unstable/httpapi"
import * as Sse from "effect/unstable/encoding/Sse"
import { Api } from "../api"

function eventData(data: unknown): Sse.Event {
  return {
    _tag: "Event",
    event: "message",
    id: undefined,
    data: JSON.stringify(data),
  }
}

export const EventHandler = HttpApiBuilder.group(Api, "server.event", (handlers) =>
  Effect.gen(function* () {
    const events = yield* EventV2.Service
    return handlers.handleRaw("event.subscribe", () =>
      Effect.gen(function* () {
        const location = yield* Location.Service
        const outputLocation = (ref?: Location.Ref) =>
          new Location.Info({
            directory: ref?.directory ?? location.directory,
            workspaceID: ref?.workspaceID ?? location.workspaceID,
            project: location.project,
          })
        const outputEvent = (event: EventV2.Payload) => ({
          id: event.id,
          type: event.type,
          location: outputLocation(event.location),
          ...(event.metadata ? { metadata: event.metadata } : {}),
          ...(event.version === undefined ? {} : { version: event.version }),
          data: event.data,
        })
        const connected = {
          id: EventV2.ID.create(),
          type: "server.connected",
          location: outputLocation(),
          data: {},
        }
        return HttpServerResponse.stream(
          Stream.make(connected).pipe(
            Stream.concat(
              events
                .all()
                .pipe(
                  Stream.filter(
                    (event) =>
                      event.location?.directory === location.directory &&
                      event.location.workspaceID === location.workspaceID,
                  ),
                  Stream.map(outputEvent),
                ),
            ),
            Stream.map(eventData),
            Stream.pipeThroughChannel(Sse.encode()),
            Stream.encodeText,
          ),
          {
            contentType: "text/event-stream",
            headers: {
              "Cache-Control": "no-cache, no-transform",
              "X-Accel-Buffering": "no",
              "X-Content-Type-Options": "nosniff",
            },
          },
        )
      }),
    )
  }),
)
