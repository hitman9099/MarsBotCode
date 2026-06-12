import { describe, expect, test } from "bun:test"

import { shouldShowMarsbotHomeEmptyState, shouldShowMarsbotProjectSidebarEmptyState } from "./home-empty-state"

describe("shouldShowMarsbotHomeEmptyState", () => {
  test("shows the MarsbotCode demo empty state only for an idle home with no projects", () => {
    expect(
      shouldShowMarsbotHomeEmptyState({
        projectCount: 0,
        search: "",
        loading: false,
      }),
    ).toBe(true)
  })

  test("keeps the normal home states for loading, search, or existing projects", () => {
    expect(
      shouldShowMarsbotHomeEmptyState({
        projectCount: 0,
        search: "",
        loading: true,
      }),
    ).toBe(false)
    expect(
      shouldShowMarsbotHomeEmptyState({
        projectCount: 0,
        search: "fix",
        loading: false,
      }),
    ).toBe(false)
    expect(
      shouldShowMarsbotHomeEmptyState({
        projectCount: 1,
        search: "",
        loading: false,
      }),
    ).toBe(false)
  })

  test("shows a filled sidebar empty state when no projects are open", () => {
    expect(shouldShowMarsbotProjectSidebarEmptyState({ projectCount: 0 })).toBe(true)
    expect(shouldShowMarsbotProjectSidebarEmptyState({ projectCount: 1 })).toBe(false)
  })
})
