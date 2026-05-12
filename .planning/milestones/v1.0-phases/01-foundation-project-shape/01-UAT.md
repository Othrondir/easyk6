---
status: complete
phase: 01-foundation-project-shape
source:
  - 01-01-SUMMARY.md
  - 01-02-SUMMARY.md
  - 01-03-SUMMARY.md
started: 2026-05-08T00:00:00Z
updated: 2026-05-08T00:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Build produces smoke-shell artifact
expected: `npm run build` succeeds; `dist/tests/smoke/smoke-shell.test.js` exists.
result: pass
evidence: `vite v5.4.21 ... built in 70ms`; `dist/tests/smoke/smoke-shell.test.js` (6.34 kB) emitted.

### 2. validate-build passes
expected: `node scripts/validate-build.mjs` reports the smoke artifact and runtime-config/runner contract files present, exits 0.
result: pass
evidence: `Validated build shell: dist/tests/smoke/smoke-shell.test.js, scripts/perf-runner.mjs, .env.example, lib/config/runtime-config.ts` (exit 0).

### 3. Repo layout shows new architecture
expected: Root contains `src/pages/`, `lib/pages/`, `lib/pages-k6-patches/`, `k6/scenarios/`, and `legacy-js/`. README opens with the new TypeScript-first story, not the JS starter.
result: pass
evidence: All 5 dirs present; README.md L1-L38 leads with "Architecture First" tree and boundary labels.

### 4. perf --show-config prints resolved config
expected: `node scripts/perf-runner.mjs --profile smoke --show-config` prints JSON with the resolved baseUrl (demo default or supplied value), no k6 spawn.
result: pass
note: Demo defaults are explicit-opt-in. Verified via `--profile smoke --demo --show-config` → JSON with `baseUrl: https://othrondir.github.io/QAbbalah/`. Without `--demo` and without BASE_URL the runner correctly fails fast (covered by Test 6).

### 5. perf --dry-run prints k6 command line
expected: `node scripts/perf-runner.mjs --profile smoke --dry-run` prints a literal `k6 run ...` line pointing at `dist/tests/smoke/smoke-shell.test.js`, does not execute k6.
result: pass
evidence: `--profile smoke --demo --dry-run` → `Resolved base URL: https://othrondir.github.io/QAbbalah/` and `k6 run dist/tests/smoke/smoke-shell.test.js`.

### 6. Fail-fast on missing BASE_URL outside demo
expected: `node scripts/perf-runner.mjs --profile smoke --env-file .env.example --dry-run` fails with `BASE_URL is required when demo mode is disabled.`
result: pass
evidence: stderr `BASE_URL is required when demo mode is disabled.` exit 1.

### 7. Shell BASE_URL flows through runner
expected: `BASE_URL=https://shell.example.test node scripts/perf-runner.mjs --profile smoke --dry-run` reports `Resolved base URL: https://shell.example.test/`.
result: pass
evidence: `Resolved base URL: https://shell.example.test/` printed.

### 8. .env / --env-file overrides shell env
expected: With `BASE_URL=https://shell.example.test` set in shell AND a `.env` (or `--env-file`) defining a different `BASE_URL`, the `.env` value wins in `--show-config`/`--dry-run` output.
result: pass
evidence: Shell `BASE_URL=https://shell.example.test` + `--env-file /tmp/easyk6-uat/.env.test` (BASE_URL=https://envfile.example.test) → `Resolved base URL: https://envfile.example.test/`.

### 9. Unit tests pass
expected: `node --test tests/unit/runtime-config.test.mjs tests/unit/perf-runner.test.mjs` reports 7 passing, 0 failing.
result: pass
evidence: `# tests 7 # pass 7 # fail 0`.

### 10. README documents precedence and command surface
expected: README states precedence `CLI > .env > shell env > built-in demo defaults` and shows `perf`, `smoke`, `sync`, `convert` commands with shell-env example.
result: pass
evidence: README L68 `Runtime precedence is 'CLI > .env > shell env > built-in demo defaults.'`; L42-50 lists smoke/perf/sync/convert; L77 documents shell-only invocation.

## Summary

total: 10
passed: 10
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none]
