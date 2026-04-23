---
phase: 01-foundation-project-shape
verified: 2026-04-23T11:01:17.2119550Z
status: gaps_found
score: 4/5 must-haves verified
gaps:
  - truth: "Developer can configure base URL through env files or env vars without code edits"
    status: failed
    reason: "The public runner honors CLI flags and parsed `.env` files, but ignores shell-provided `BASE_URL`, so BUILD-02 is only partially implemented."
    artifacts:
      - path: "scripts/perf-runner.mjs"
        issue: "Resolves runtime config from `loadedEnv` only, so `process.env.BASE_URL` is dropped before `resolveRuntimeConfig()` runs."
      - path: "tests/unit/runtime-config.test.mjs"
        issue: "Covers `.env`, CLI override, and fail-fast errors, but does not cover direct environment-variable input through the public runner."
    missing:
      - "Merge `process.env` with parsed `.env` values before calling `resolveRuntimeConfig()`, while preserving the intended precedence."
      - "Add a runner-level test or automated spot-check that proves `BASE_URL` supplied directly through the shell is accepted."
      - "Document the supported env-var path alongside the existing `.env` examples once the runner honors it."
---

# Phase 1: Foundation & Project Shape Verification Report

**Phase Goal:** `easyk6` has a clean project shape, modern build path, and validated config surface ready for real adaptation work
**Verified:** 2026-04-23T11:01:17.2119550Z
**Status:** gaps_found
**Re-verification:** No - initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | The repo has a documented build command for the adapted structure. | ✓ VERIFIED | `package.json` exposes `build` and `validate:build`; `README.md` documents `npm run build`; `npm run build` emitted `dist/tests/smoke/smoke-shell.test.js`. |
| 2 | Runtime configuration fails early with a clear message when required values are missing or invalid. | ✓ VERIFIED | `lib/config/runtime-config.ts` throws explicit missing/invalid URL errors; `node --test tests/unit/runtime-config.test.mjs` passed all 5 tests; runner spot-checks returned the expected error text. |
| 3 | Project folders communicate upstream vs generated vs custom responsibilities clearly. | ✓ VERIFIED | `README.md` and `PROJECT_STRUCTURE.md` label `src/pages`, `lib/pages`, `lib/pages-k6-patches`, and `legacy-js`; the boundary directories exist in the repo. |
| 4 | The runner surface is obvious enough that later smoke work plugs into it without reshaping the repo again. | ✓ VERIFIED | `package.json` routes `perf` and `smoke` through `scripts/perf-runner.mjs`; the runner resolves config, supports `--show-config` and `--dry-run`, and targets `dist/tests/smoke/smoke-shell.test.js`. |
| 5 | Developer can configure runtime through env files or env vars without code edits. | ✗ FAILED | `.env` and CLI overrides work, but `$env:BASE_URL='https://shell.example.test'; node scripts/perf-runner.mjs --profile smoke --dry-run` failed with `BASE_URL is required when demo mode is disabled.` |

**Score:** 4/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `package.json` | Public build and runner command surface | ✓ VERIFIED | `build`, `validate:build`, `perf`, `smoke`, `sync:src`, and `convert-pages` exist and point to the expected scripts. |
| `vite.config.ts` | Vite multi-entry CommonJS build plus repo aliases | ✓ VERIFIED | Discovers `./k6/simulations/**/*.test.ts`, emits CommonJS bundles, and wires aliases for `@config`, `@pages`, `@src-pages`, and `@k6`. |
| `README.md` and `PROJECT_STRUCTURE.md` | Architecture-first documentation of folder responsibilities and commands | ✓ VERIFIED | Both docs present the new TypeScript-first layout before the `legacy-js` archive and document the build path. |
| `src/pages/.gitkeep`, `lib/pages/.gitkeep`, `lib/pages-k6-patches/.gitkeep`, `k6/scenarios/.gitkeep` | Reserved Phase 2/3 boundaries exist now | ✓ VERIFIED | Boundary directories are present and empty by design. |
| `.env.example` | Minimal root env contract | ✓ VERIFIED | Defines `BASE_URL=` and explains that `npm run smoke` defaults to demo mode. |
| `lib/config/runtime-config.ts` | Shared precedence and fail-fast validation logic | ✓ VERIFIED | Centralizes demo defaults, `.env` precedence, URL validation, and entry-file resolution. |
| `scripts/perf-runner.mjs` | Public runner shell for `perf` and `smoke` | ⚠ PARTIAL | Supports CLI, `.env`, show-config, dry-run, and k6 spawn, but drops shell-provided `BASE_URL` before config resolution. |
| `tests/unit/runtime-config.test.mjs` | Automated config contract coverage | ⚠ PARTIAL | Strong coverage for demo, `.env`, CLI override, and validation errors; missing direct env-var runner coverage. |
| `k6/simulations/smoke/smoke-shell.test.ts` | Minimal browser smoke entry wired to shared config | ✓ VERIFIED | Imports `@config`, configures a Chromium browser scenario, and navigates to the resolved base URL. |
| `scripts/validate-build.mjs` | Phase build-contract validator | ✓ VERIFIED | Checks the smoke bundle plus runner/config contract files and passed in verification. |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `package.json` | `vite.config.ts` | `npm run build` | ✓ WIRED | `build` points to `vite build`, and the build succeeded. |
| `package.json` | `scripts/perf-runner.mjs` | `npm run perf` / `npm run smoke` | ✓ WIRED | Both scripts route through the public runner, and `npm run smoke -- --dry-run` succeeded. |
| `scripts/perf-runner.mjs` | `lib/config/runtime-config.ts` | direct import + `resolveRuntimeConfig()` | ✓ WIRED | Runner imports the shared resolver and uses it before show-config, dry-run, or k6 spawn. |
| `scripts/perf-runner.mjs` | `dist/tests/smoke/smoke-shell.test.js` | `runtimeConfig.entryFile` + validate-build | ✓ WIRED | Dry-run prints `k6 run dist/tests/smoke/smoke-shell.test.js`, and `validate-build` checks the same artifact. |
| `k6/simulations/smoke/smoke-shell.test.ts` | `lib/config/runtime-config.ts` | `@config` alias through Vite/TS path mapping | ✓ WIRED | The smoke entry imports `@config`, and `npm run build` proves the alias resolves into the bundle. |
| `README.md` | `PROJECT_STRUCTURE.md` | documented architecture reference | ✓ WIRED | README points readers to `PROJECT_STRUCTURE.md` for the folder-by-folder breakdown. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| `scripts/perf-runner.mjs` | `runtimeConfig.baseUrl` | CLI options + parsed `.env` -> `resolveRuntimeConfig()` | Yes for CLI and `.env`; no for shell `process.env.BASE_URL` | ⚠ PARTIAL |
| `k6/simulations/smoke/smoke-shell.test.ts` | `runtimeConfig.baseUrl` | `__ENV.BASE_URL` injected by the runner -> `resolveRuntimeConfig()` | Yes when the runner is fed by CLI or `.env` | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Runtime-config unit coverage | `node --test tests/unit/runtime-config.test.mjs` | 5 tests passed | ✓ PASS |
| Adapted build path emits the smoke bundle | `npm run build` | Built `dist/tests/smoke/smoke-shell.test.js` | ✓ PASS |
| Build contract validator sees required files | `node scripts/validate-build.mjs` | Printed validated build shell summary | ✓ PASS |
| Demo config inspection works | `node scripts/perf-runner.mjs --profile smoke --demo --show-config` | Printed normalized JSON with QAbbalah URL and smoke entry file | ✓ PASS |
| Demo smoke command is wired through the runner | `npm run smoke -- --dry-run` | Printed demo URL and `k6 run dist/tests/smoke/smoke-shell.test.js` | ✓ PASS |
| Invalid URL is rejected early | `node scripts/perf-runner.mjs --profile smoke --base-url notaurl --dry-run` | Exited with `BASE_URL must be a valid absolute URL.` | ✓ PASS |
| Shell env-var configuration works through the public runner | `$env:BASE_URL='https://shell.example.test'; node scripts/perf-runner.mjs --profile smoke --dry-run` | Exited with `BASE_URL is required when demo mode is disabled.` | ✗ FAIL |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| `BUILD-01` | `01-01-PLAN.md`, `01-02-PLAN.md` | Developer can build k6 test assets from the adapted project structure with one documented command | ✓ SATISFIED | `package.json` documents `build`; `README.md` documents `npm run build`; `npm run build` produced `dist/tests/smoke/smoke-shell.test.js`. |
| `BUILD-02` | `01-02-PLAN.md` | Developer can configure base URL and other required runtime settings through env files or env vars that fail fast when invalid | ✗ BLOCKED | `.env` and CLI override paths work and fail fast when invalid, but the public runner ignores direct shell `BASE_URL`, so the env-var half of the requirement is not met. |

No orphaned Phase 1 requirements were found in `REQUIREMENTS.md`.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `scripts/sync-src.mjs` | 1 | Placeholder-only implementation | ℹ INFO | Explicitly deferred to Phase 2; not a Phase 1 blocker. |
| `scripts/convert-pages.mjs` | 1 | Placeholder-only implementation | ℹ INFO | Explicitly deferred to Phase 2; not a Phase 1 blocker. |

### Human Verification Required

None. The blocking issue is programmatically reproducible, and the rest of Phase 1 behavior was verified with local commands.

### Gaps Summary

Phase 1 is close: the repo shape, documented build path, shared runtime-config module, and smoke/perf runner shell are all present and working. The remaining blocker is BUILD-02 completeness. The public runner currently ignores shell-provided environment variables because it resolves config from parsed `.env` data only, so a developer cannot configure `BASE_URL` through env vars as the requirement states. Closing that gap requires merging `process.env` into runner resolution, adding coverage for that path, and documenting it.

---

_Verified: 2026-04-23T11:01:17.2119550Z_
_Verifier: Claude (gsd-verifier)_
