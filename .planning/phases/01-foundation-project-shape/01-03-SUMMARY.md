---
phase: 01-foundation-project-shape
plan: "03"
subsystem: infra
tags: [runtime-config, perf-runner, shell-env, build-02, gap-closure]
gap_closure: true
requires:
  - phase: 01-02
    provides: Shared runtime-config contract, perf/smoke runner shell, first smoke browser entry
provides:
  - Shell-supplied BASE_URL flows through the public runner without weakening .env precedence
  - Runner-level automated coverage for shell-env and .env precedence paths
  - README documentation of the effective CLI > .env > shell env > built-in demo precedence
affects: [02-01, 03-01, runner, docs]
tech-stack:
  added: []
  patterns:
    - mergeRuntimeEnv pairs shell env underneath parsed .env so dotenv values still win
    - Runner CLI now passes one mergedEnv object into both resolveRuntimeConfig() and toRunnerEnv()
key-files:
  created:
    - tests/unit/perf-runner.test.mjs
  modified:
    - scripts/perf-runner.mjs
    - README.md
key-decisions:
  - "Layer process.env beneath parsed .env via mergeRuntimeEnv so the documented .env-wins precedence still holds when both sources define BASE_URL."
  - "Cover the runner end-to-end with spawned dry-runs rather than refactoring the runner internals for direct unit access — keeps the public contract honest."
patterns-established:
  - "Shell env is a real, documented input to the public runner, sitting below CLI flags and .env files but above demo defaults."
requirements-completed: [BUILD-02]
duration: 6 min
completed: 2026-05-08
---

# Phase 01 Plan 03: BUILD-02 Shell-Env Gap Closure Summary

**Teach the public perf runner to honor shell-provided BASE_URL while preserving the CLI > .env precedence already documented for the runtime-config module.**

## Performance

- **Duration:** ~6 min
- **Completed:** 2026-05-08
- **Tasks:** 2
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments

- Added `mergeRuntimeEnv(shellEnv, loadedEnv)` in `scripts/perf-runner.mjs` and threaded the merged object through both `resolveRuntimeConfig()` and `toRunnerEnv()`.
- Added `tests/unit/perf-runner.test.mjs` with two child-process dry-run tests proving shell `BASE_URL` is accepted and that an explicit `--env-file` still wins over shell values.
- Documented the effective precedence `CLI > .env > shell env > built-in demo defaults` in README and added a shell-only invocation example.

## Task Commits

Each task was committed atomically:

1. **Task 1: Merge shell env into runner config resolution** — `12868fd` (`feat`)
2. **Task 2: Add runner-level env-path coverage and document the shell-env workflow** — `a04e143` (`test`)

## Files Created/Modified

- `scripts/perf-runner.mjs` — Adds `mergeRuntimeEnv`, builds `mergedEnv` once in `main()`, and passes it to both the resolver and `toRunnerEnv`.
- `tests/unit/perf-runner.test.mjs` — Spawns `node scripts/perf-runner.mjs --profile smoke --dry-run` to assert shell-only and env-file-overrides-shell precedence.
- `README.md` — Updates the runtime precedence statement and adds a shell-env example next to the existing `.env` and CLI flows.

## Verification Results

- `node --test tests/unit/runtime-config.test.mjs tests/unit/perf-runner.test.mjs` → 7 tests pass, 0 fail.
- `npm run build && node scripts/validate-build.mjs` → built `dist/tests/smoke/smoke-shell.test.js`; validator confirms shell + runtime-config files.
- `BASE_URL=https://shell.example.test node scripts/perf-runner.mjs --profile smoke --dry-run` → `Resolved base URL: https://shell.example.test/`.
- `node scripts/perf-runner.mjs --profile smoke --env-file .env.example --dry-run` → fails fast with `BASE_URL is required when demo mode is disabled.`

## Decisions Made

- Kept `resolveRuntimeConfig()` as the single source of precedence truth; the runner only assembles a `mergedEnv` and hands it in. Avoids duplicating precedence logic across files.
- Tested through child-process dry-runs instead of importing runner internals so the public command surface stays the contract.

## Deviations from Plan

None — both tasks executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None.

## Next Phase Readiness

- BUILD-02 verification gap is closed: env-var configuration now actually works through the public entrypoint.
- Phase 1 can be marked complete after `/gsd-verify-work` re-runs against the new runner-level coverage.
- Phase 2 (Upstream Sync & k6 Adaptation) inherits a stable runner contract and can proceed without further config reshaping.

## Self-Check: PASSED

- Found summary file: `.planning/phases/01-foundation-project-shape/01-03-SUMMARY.md`
- Found task commit: `12868fd`
- Found task commit: `a04e143`
