# Desktop Permission Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Beta-level MarsbotCode Desktop permission center that summarizes audited permission requests and decisions from local audit logs.

**Architecture:** Reuse the existing desktop audit reader and app platform API. Add a small pure summary module in `packages/app` for deterministic tests, then add a Solid dialog and entry points from the MarsbotCode status popover and Workbench.

**Tech Stack:** TypeScript, Solid, Bun test, Electron IPC already exposed through `platform.getMarsbotAudit`.

---

### Task 1: Permission Summary Logic

**Files:**
- Create: `packages/app/src/components/marsbot-permission-summary.ts`
- Create: `packages/app/src/components/marsbot-permission-summary.test.ts`

- [x] **Step 1: Write failing tests**

Create tests that cover:
- permission request/granted/rejected aggregation
- pending calculation by permission id
- query, decision filter, and limit behavior
- readable fallback values for records without rich data

Run: `bun test src/components/marsbot-permission-summary.test.ts` from `packages/app`
Expected: FAIL because the module does not exist yet.

- [x] **Step 2: Implement summary module**

Create `buildMarsbotPermissionSummary(input)` that:
- filters audit records whose `type` is `permission` or whose `phase` starts with `permission.`
- normalizes decisions to `requested`, `granted`, `rejected`, or `pending`
- groups records by `permissionID`, `id`, `callID`, or a stable fallback key
- computes `requests`, `granted`, `rejected`, and `pending`
- returns latest-first rows with search and decision filtering

- [x] **Step 3: Verify tests pass**

Run: `bun test src/components/marsbot-permission-summary.test.ts` from `packages/app`
Expected: PASS.

### Task 2: Desktop Permission Center Dialog

**Files:**
- Create: `packages/app/src/components/dialog-marsbot-permissions.tsx`

- [x] **Step 1: Add dialog UI**

Create a `DialogMarsbotPermissions` component that:
- loads `platform.getMarsbotAudit(directory, { type: "permission", limit: 500 })`
- displays Requests, Granted, Rejected, and Pending summary cards
- supports All, Pending, Granted, and Rejected filters
- supports local search
- supports Refresh and Open audit dir
- clearly handles no project, unsupported platform, loading, failure, and empty states

- [x] **Step 2: Keep it read-only**

Do not call `permission.respond` from this dialog in the MVP. This phase is an audited permission center and history surface; realtime allow/deny remains in the existing session permission dock.

### Task 3: Entry Points

**Files:**
- Modify: `packages/app/src/components/status-popover-body.tsx`
- Modify: `packages/app/src/components/dialog-marsbot-workbench.tsx`

- [x] **Step 1: Add status popover entry**

Add a `Permissions` button to the MarsbotCode panel and dynamically import `dialog-marsbot-permissions`.

- [x] **Step 2: Add Workbench entry**

Add an `onViewPermissions` prop and a `Permissions` button near the audit action so the workbench can open the same dialog.

### Task 4: Verification And Release

**Files:**
- Modify: `docs/marsbotcode-todolist.md`
- Modify: `docs/marsbotcode-task-status.md`

- [x] **Step 1: Run package checks**

Run:
- `bun test src/components/marsbot-permission-summary.test.ts` from `packages/app`
- `git diff --check`
- `bun run typecheck`

- [x] **Step 2: Build stage release**

Run: `bun run release:stage -- --stage desktop-permission-center`

Expected:
- CLI zip generated
- Desktop Windows deployable zip generated
- manifest and SHA256SUMS generated
- Windows installer may fallback to `win-unpacked` zip in this environment

- [x] **Step 3: Smoke test release artifacts**

Verify:
- extracted CLI `bin\marsbotcode.cmd --version` prints the stage version
- Desktop zip contains `MarsbotCode Beta.exe`
- Desktop zip contains `resources/app.asar`

- [x] **Step 4: Update docs**

Record:
- stage version
- release directory
- CLI zip path and SHA256
- Desktop zip path and SHA256
- verification results
- known installer fallback limitation

- [ ] **Step 5: Commit and push**

Commit feature work with `feat: add desktop permission center`.
Commit release documentation with `docs: record desktop permission center release`.
Push `codex/runtime-audit` to `marsbotcode`.
