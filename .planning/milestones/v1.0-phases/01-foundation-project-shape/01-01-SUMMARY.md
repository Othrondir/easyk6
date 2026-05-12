---
phase: 01-foundation-project-shape
plan: "01"
subsystem: infra
tags: [vite, typescript, k6, repo-shape, legacy-js]
requires: []
provides:
  - Vite multi-entry CommonJS build output under dist/tests
  - Placeholder public commands for perf, smoke, sync, and conversion
  - Root architecture boundaries for src/pages, lib/pages, lib/pages-k6-patches, and k6/scenarios
  - Archived JavaScript starter assets under legacy-js
affects: [01-02, 02-01, 02-02, build, docs]
tech-stack:
  added: [typescript@5.9.3, vite@5.4.21, glob@10.4.5, vite-plugin-node-polyfills@0.19.0, @types/k6@0.45.3]
  patterns:
    - Vite discovers k6 simulation entrypoints and emits CommonJS bundles to dist/tests
    - Root folders separate upstream source, generated output, and k6-only custom patches
key-files:
  created:
    - tsconfig.json
    - vite.config.ts
    - scripts/perf-runner.mjs
    - scripts/sync-src.mjs
    - scripts/convert-pages.mjs
    - scripts/validate-build.mjs
    - k6/simulations/smoke/smoke-shell.test.ts
    - src/pages/.gitkeep
    - lib/pages/.gitkeep
    - lib/pages-k6-patches/.gitkeep
    - k6/scenarios/.gitkeep
  modified:
    - package.json
    - package-lock.json
    - .gitignore
    - README.md
    - PROJECT_STRUCTURE.md
    - legacy-js/**
key-decisions:
  - "Keep the public smoke/perf/sync/convert command surface present now, but make the unfinished commands explicit placeholders instead of fake implementations."
  - "Archive the old JavaScript starter under legacy-js so the root layout tells the new TypeScript-first story immediately."
patterns-established:
  - "Build pattern: bundle k6/simulations/**/*.test.ts into dist/tests/**/*.js with Vite CommonJS output."
  - "Repo-shape pattern: reserve src/pages for synced upstream code, lib/pages for generated code, and lib/pages-k6-patches for durable manual overrides."
requirements-completed: [BUILD-01]
duration: 3 min
completed: 2026-04-23
---

# Phase 01 Plan 01: Foundation Project Shape Summary

**Vite/CommonJS smoke build shell with TypeScript repo boundaries and the original JavaScript starter archived under legacy-js**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-23T10:35:29Z
- **Completed:** 2026-04-23T10:38:32Z
- **Tasks:** 2
- **Files modified:** 30

## Accomplishments

- Replaced the old direct `k6 run` script surface with a real Vite and TypeScript build foundation.
- Added stable placeholder public commands and a smoke-shell build artifact that validates successfully.
- Moved the old starter tree into `legacy-js/` and rewrote the top-level docs so the new architecture is the first thing a reviewer sees.

## Task Commits

Each task was committed atomically:

1. **Task 1: Install TypeScript/Vite foundation and stable placeholder build entry** - `7b61e15` (`chore`)
2. **Task 2: Move starter assets under legacy-js and document new repo boundaries** - `376e6be` (`feat`)

## Files Created/Modified

- `package.json` - Defines the new build, validation, smoke, perf, sync, and convert command surface.
- `tsconfig.json` - Establishes the Phase 1 TypeScript alias map for future runtime-config and page-layer work.
- `vite.config.ts` - Discovers `k6/simulations/**/*.test.ts` entries and emits CommonJS bundles under `dist/tests/...`.
- `scripts/perf-runner.mjs` - Keeps public smoke/perf commands non-broken while their real runtime behavior waits for Plan 01-02.
- `scripts/sync-src.mjs` and `scripts/convert-pages.mjs` - Reserve the Phase 2 workflow entrypoints with explicit placeholder messaging.
- `scripts/validate-build.mjs` - Fails fast when the expected smoke-shell build artifact is missing.
- `k6/simulations/smoke/smoke-shell.test.ts` - Provides the initial stable smoke-shell build target.
- `README.md` and `PROJECT_STRUCTURE.md` - Reframe the repository around `src/pages`, `lib/pages`, `lib/pages-k6-patches`, and `legacy-js`.
- `legacy-js/**` - Preserves the original JavaScript starter assets without leaving them at the root.

## Decisions Made

- Used a Vite multi-entry CommonJS build so future k6 simulations can grow without another build-system reshuffle.
- Preserved recruiter-friendly root commands even though three of them are still placeholders, because the command grammar is part of the repo contract.
- Demoted the original starter to `legacy-js/` instead of leaving a hybrid root layout, because the root tree now needs to communicate the new architecture first.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Normalized Windows Vite entry discovery**
- **Found during:** Task 1 (Install TypeScript/Vite foundation and stable placeholder build entry)
- **Issue:** `vite build` failed because the glob result did not match the original `./k6/...` regex on this Windows checkout, leaving Rollup with no input entries.
- **Fix:** Normalized matched paths in `vite.config.ts` before deriving entry names and absolute file paths.
- **Files modified:** `vite.config.ts`
- **Verification:** `npm run build` produced `dist/tests/smoke/smoke-shell.test.js`
- **Committed in:** `7b61e15`

**2. [Rule 3 - Blocking] Unignored committed JSON foundation files**
- **Found during:** Task 1 (Install TypeScript/Vite foundation and stable placeholder build entry)
- **Issue:** The inherited `*.json` ignore rule blocked `tsconfig.json` and `package-lock.json` from entering the task commit.
- **Fix:** Updated `.gitignore` to allow `tsconfig.json` and `package-lock.json` while keeping the existing package metadata exceptions.
- **Files modified:** `.gitignore`
- **Verification:** `git status --short` showed both files as stageable after the fix
- **Committed in:** `7b61e15`

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both fixes were required to make the planned build foundation verifiable and commitable. No scope creep beyond correctness.

## Issues Encountered

- `npm install` emitted a deprecation warning for the plan-pinned `glob@10.4.5`. The version is locked by the plan and did not block the build or validation flow.

## User Setup Required

None - no external service configuration required.

## Known Stubs

- `scripts/perf-runner.mjs:1` - Intentional Phase 1 placeholder until Plan 01-02 replaces it with the real config-aware runner shell.
- `scripts/sync-src.mjs:1` - Intentional Phase 2 placeholder until upstream sync work lands.
- `scripts/convert-pages.mjs:1` - Intentional Phase 2 placeholder until conversion work lands.
- `k6/simulations/smoke/smoke-shell.test.ts:1` - Minimal no-op smoke entry kept only to anchor the build target before Plan 01-02 upgrades the shell.

## Next Phase Readiness

- Ready for `01-02-PLAN.md` to add `.env.example`, runtime-config resolution, and the real `perf`/`smoke` runner behavior.
- The repo now has stable build output, documented folder boundaries, and isolated legacy assets with no blockers for the next plan.

## Self-Check: PASSED

- Found summary file: `.planning/phases/01-foundation-project-shape/01-01-SUMMARY.md`
- Found task commit: `7b61e15`
- Found task commit: `376e6be`
