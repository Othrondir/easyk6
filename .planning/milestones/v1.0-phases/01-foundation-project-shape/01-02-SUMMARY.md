---
phase: 01-foundation-project-shape
plan: "02"
subsystem: infra
tags: [runtime-config, commander, dotenv, k6-browser, smoke]
requires:
  - phase: 01-01
    provides: Vite/CommonJS build output, the root architecture boundaries, and the smoke-shell build target
provides:
  - Shared runtime-config precedence and fail-fast URL validation
  - A real public perf/smoke runner shell with show-config and dry-run modes
  - A minimal Chromium smoke browser entry wired to the shared config contract
affects: [02-01, 03-01, 03-02, build, runner, docs]
tech-stack:
  added: [commander@11.1.0, dotenv@17.2.3]
  patterns:
    - Shared runtime-config resolution is reused by both the Node runner and the k6 smoke shell
    - Public runner commands expose non-destructive inspection modes before real k6 execution
key-files:
  created:
    - .env.example
    - lib/config/runtime-config.ts
    - tests/unit/runtime-config.test.mjs
  modified:
    - README.md
    - package.json
    - package-lock.json
    - scripts/perf-runner.mjs
    - scripts/validate-build.mjs
    - k6/simulations/smoke/smoke-shell.test.ts
key-decisions:
  - "Keep runtime precedence and validation in lib/config/runtime-config.ts so the runner and smoke shell resolve the same base URL contract."
  - "Make show-config and dry-run first-class runner modes so recruiters can inspect the command path before k6 launches."
patterns-established:
  - "Runtime config pattern: CLI > .env > built-in demo defaults with explicit failure outside demo mode."
  - "Runner pattern: perf/smoke resolve env-backed config in Node, then pass normalized values into the k6 process."
requirements-completed: [BUILD-01, BUILD-02]
duration: 7 min
completed: 2026-04-23
---

# Phase 01 Plan 02: Runtime Config And Smoke Runner Summary

**Root `.env` config precedence with fail-fast URL validation, a real perf/smoke runner shell, and a minimal Chromium smoke entry**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-23T12:45:38Z
- **Completed:** 2026-04-23T12:53:10Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Added a shared `lib/config/runtime-config.ts` module that centralizes precedence, normalization, and invalid-config failures.
- Replaced the placeholder `perf` runner with a real CLI backed by `commander` and `dotenv`, including `--show-config` and `--dry-run`.
- Upgraded the smoke-shell entry into a minimal k6 browser scenario and extended build validation to cover the runner and config contract files.

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement shared runtime config with root env convention and fail-fast validation** - `b6481df` (`feat`)
2. **Task 2: Turn perf command into real runner shell and upgrade smoke shell entry** - `38092d7` (`feat`)

## Files Created/Modified

- `.env.example` - Defines the root `BASE_URL` contract and documents demo-mode behavior.
- `lib/config/runtime-config.ts` - Centralizes CLI/env precedence, URL validation, and entry-file normalization.
- `tests/unit/runtime-config.test.mjs` - Covers demo defaults, env loading, CLI override precedence, and failure cases with `node:test`.
- `scripts/perf-runner.mjs` - Parses the public CLI grammar, loads env data through `dotenv`, prints config/dry-run output, and spawns `k6`.
- `k6/simulations/smoke/smoke-shell.test.ts` - Provides the first real Chromium smoke shell that resolves shared runtime config and visits the selected base URL.
- `scripts/validate-build.mjs` - Verifies the built smoke artifact plus the runtime runner/config contract files.
- `README.md` - Documents the root `.env` convention and the supported smoke/perf command examples.
- `package.json` and `package-lock.json` - Add the pinned runtime dependencies required by the new runner.

## Decisions Made

- Reused `lib/config/runtime-config.ts` directly from both Node and the smoke shell so precedence logic cannot drift between entrypoints.
- Kept runner inspection modes intentionally simple: JSON for `--show-config` and a literal `k6 run ...` line for `--dry-run`.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 1 is ready to close: the repo now has validated build output, env-backed runtime config, and a truthful public smoke/perf runner surface.
- Phase 2 can build on stable source/generated/custom boundaries without needing another config or CLI reshape first.

## Self-Check: PASSED

- Found summary file: `.planning/phases/01-foundation-project-shape/01-02-SUMMARY.md`
- Found task commit: `b6481df`
- Found task commit: `38092d7`
