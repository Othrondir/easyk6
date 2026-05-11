---
phase: 04-example-profiles-output-surface
plan: 02
subsystem: load-capacity-entries+scripts+validate-build+readme+real-evidence
tags: [prof-02, prof-03, prof-04, load-profile, capacity-profile, example-labeling, validate-build, readme-quickstart, browser-http-req-duration-amendment, deviation-mkdir-reports, capacity-real-run-deferred]

# Dependency graph
requires:
  - phase: 04-example-profiles-output-surface
    plan: 01
    provides: lib/simulations/lib/summary.ts (makeHandleSummary factory + ProfileMetadata interface), lib/simulations/lib/format-md.ts (D-11 5-section formatter with `n/a (no samples — browser scenario)` fallback), lib/simulations/lib/format-json.ts, smoke.ts rewired through makeHandleSummary, 96/96 test baseline, scenarios-registry.test.mjs::loadSmokeOptions stub map including `./lib/summary`.
  - phase: 03-smoke-scenarios-supported-execution
    plan: 02
    provides: lib/scenarios/{home-smoke,blog-post-smoke}.ts, lib/config/runtime-config.ts (goja-safe regex normalizeBaseUrl, profile-keyed resolveEntryFile), scripts/perf-runner.mjs (buildK6Args explicit -e flags, announce banner on real runs, exec.test.abort fail-fast pattern), Plan 03-01 PHASE_ONE_SMOKE_ENTRY_FILE transition alias (now retired here per D-18).
provides:
  - lib/simulations/load.ts (122 lines) — D-14 EXAMPLE PROFILE JSDoc banner; imports `browser` (k6/browser), `exec` (k6/execution), `resolveRuntimeConfig` (@config), `K6PlaywrightSelectors` (@pages/base/selectors), `SCENARIO_REGISTRY` (@lib/scenarios), `makeHandleSummary` (./lib/summary). `options.scenarios.browser.executor = 'ramping-vus'`, `startVUs = 0`, stages `[{duration:'30s',target:5},{duration:'60s',target:5},{duration:'30s',target:0}]`, `gracefulRampDown = '30s'`, `options.browser.type = 'chromium'`. Thresholds VERBATIM per amended D-03: `browser_web_vital_lcp:['p(95)<4000']`, `http_req_failed:['rate<0.05']`, `iteration_duration:['p(95)<25000']`, `browser_http_req_duration:['p(95)<2000']` (the chromium-routed metric per RESEARCH §5 Pitfall 1). Default function: `await page.goto(runtimeConfig.baseUrl)` Q3 landmine fix before `entry.fn(...)`. `exec.test.abort` fail-fast on unknown scenario. `export const handleSummary = makeHandleSummary({ profile: 'load', scenarioGetter: () => __ENV.SCENARIO ?? 'home-smoke', baseUrlGetter: () => __ENV.BASE_URL ?? '' });`.
  - lib/simulations/capacity.ts (124 lines) — D-14 EXAMPLE PROFILE banner; same import surface as load.ts. `options.scenarios.browser.executor = 'ramping-vus'`, stages `[{duration:'60s',target:10},{duration:'120s',target:10},{duration:'60s',target:0}]` (4-min total, 10 VU pico), `gracefulRampDown = '30s'`. Thresholds: `browser_web_vital_lcp:['p(95)<5000']`, `http_req_failed:['rate<0.10']`, `iteration_duration:['p(95)<30000']`, `browser_http_req_duration:['p(95)<3000']` (looser bounds per D-05 capacity narrative — recruiter "find the ceiling" story; soft trip is acceptable evidence shape).
  - package.json — `"example:load": "node scripts/perf-runner.mjs --profile load --demo"` and `"example:capacity": "node scripts/perf-runner.mjs --profile capacity --demo"` added between `smoke` and `sync:src` in recruiter-readable order.
  - scripts/validate-build.mjs — `requiredFiles` extended from 4 → 6 entries: adds `dist/simulations/load.js` + `dist/simulations/capacity.js`. Does NOT include `dist/simulations/lib/*.js` (harmless Vite side-products per PATTERNS CC-3 and Plan 04-01 SUMMARY note 2).
  - lib/config/runtime-config.ts — D-18 cleanup: `PHASE_ONE_SMOKE_ENTRY_FILE` constant + 5-line JSDoc preamble deleted. `SMOKE_ENTRY_FILE` retained as the canonical Phase-3-onward path. Grep `PHASE_ONE_SMOKE_ENTRY_FILE` across lib + scripts + tests now returns 0 matches (transition alias fully retired).
  - tests/unit/simulations-load.test.mjs (110 lines, 7 tests) — D-14 banner present, thresholds verbatim assertion + negative-space anti-regression (`http_req_duration:` NOT followed by `[`), stage shape, makeHandleSummary import, page.goto landmine, exec.test.abort fail-fast.
  - tests/unit/simulations-capacity.test.mjs (118 lines, 7 tests) — same shape as simulations-load.test.mjs adapted to capacity thresholds + 10-VU stages.
  - tests/unit/perf-runner.test.mjs (modified) — adds 2 dry-run tests for `--profile load` and `--profile capacity` confirming `resolveEntryFile` returns the right path for all 3 first-class profiles.
  - README.md — Quickstart 3-row Supported-vs-Example table added per D-13/D-15: `npm run smoke` (Supported — recruiter-facing smoke), `npm run example:load` (Example — illustrative load shape), `npm run example:capacity` (Example — illustrative capacity shape). Recruiter-readable.
  - scripts/perf-runner.mjs (deviation D-01, commit a7a4ad1) — `mkdirSync(resolveFromProjectRoot('reports'), { recursive: true })` added immediately before the k6 `spawn` so the Plan 04-01 D-11 artifact-emission contract works on a clean clone. `reports/` already gitignored (.gitignore:37).
affects:
  - "lib/simulations/smoke.ts": "unchanged in 04-02 — Plan 04-01 already wired handleSummary through the factory."
  - "scripts/perf-runner.mjs": "extended with mkdirSync(reports/) deviation patch; buildK6Args + announce banner unchanged from Plan 03-02."
  - ".gitignore": "no change — `reports/` already excluded at line 37 from prior phases."
tech-stack:
  added: []
  patterns:
    - "EXAMPLE PROFILE JSDoc banner pattern (D-14): multi-line `/** EXAMPLE PROFILE — <profile> testing shape. ... */` at the very top of load.ts + capacity.ts. Smoke entry stays unbannered to signal first-class status. Recruiter-scan optimized."
    - "Profile-agnostic factory reuse: load.ts and capacity.ts pass `profile: 'load'` / `profile: 'capacity'` to `makeHandleSummary` without any factory or formatter changes. `describeProfile()` in format-md.ts already returns sensible strings for unknown profiles (forward-compatible per Plan 04-01 SUMMARY note 3)."
    - "Negative-space anti-regression assertion pattern: simulations-load.test.mjs greps for `http_req_duration:` NOT followed by `[` (i.e. only matches the amended `browser_http_req_duration` keyword). Locks the D-03 amendment against accidental regression to bare `http_req_duration` (which would silently emit 0 samples per RESEARCH Pitfall 1)."
    - "Mkdir-before-spawn deviation pattern: same shape as Plan 03-02 D-01/D-02/D-03/D-04 — real-run reveals a defect, smallest-blast-radius patch lands as a tagged commit, contract preserved without rewriting upstream code."
key-files:
  created:
    - "lib/simulations/load.ts"
    - "lib/simulations/capacity.ts"
    - "tests/unit/simulations-load.test.mjs"
    - "tests/unit/simulations-capacity.test.mjs"
    - ".planning/phases/04-example-profiles-output-surface/04-02-SUMMARY.md"
  modified:
    - "package.json"
    - "scripts/validate-build.mjs"
    - "scripts/perf-runner.mjs"
    - "lib/config/runtime-config.ts"
    - "tests/unit/perf-runner.test.mjs"
    - "README.md"
deviations:
  - id: D-01-mkdir-reports-dir
    surface: scripts/perf-runner.mjs::runK6
    discovered: Verify-wave Run 1 first attempt (smoke against QAbbalah). k6 1.5 logged `level=error msg="failed to handle the end-of-test summary" error="Could not save some summary information: - could not open 'reports/smoke-home-smoke.md': open reports/smoke-home-smoke.md: The system cannot find the path specified."`
    cause: Plan 04-01 D-11 contract returns `Record<string, string>` with `reports/<profile>-<scenario>.{md,json}` keys. k6 1.5 does NOT auto-mkdir parent directories on handleSummary writes. k6 still exits 0 because the iteration body succeeded, but no artifacts land — silent failure of the verify-wave contract.
    fix: scripts/perf-runner.mjs adds `import { mkdirSync } from 'node:fs'` and calls `mkdirSync(resolveFromProjectRoot('reports'), { recursive: true })` immediately before `spawn('k6', ...)`. `reports/` already gitignored — no tracked `.gitkeep` needed.
    closes_defect_in: Plan 04-01 D-11 (the file-based handleSummary contract was specified but never exercised against a clean clone before Plan 04-02 verify-wave).
    commit: a7a4ad1
follow_ups:
  - id: F-01-capacity-real-run-deferred
    surface: lib/simulations/capacity.ts
    state: code complete (build + validate-build + 7/7 unit tests + dry-run all green); real-run evidence against QAbbalah deferred per recruiter PC saturation during verify-wave session
    rationale: Plan 04-02 verify-wave session showed PC slowdown after the load run (5 VU peak, 171 iterations). Capacity stage shape is heavier (10 VU peak, 4 min total) and the user chose to skip the real run rather than risk session destabilization. The capacity entry is otherwise observably correct — same author shape as load, same factory wiring, same 7/7 unit test coverage, same validate-build inclusion, dry-run resolves cleanly.
    recommended_owner: Phase 05 (docs + recruiter polish) OR a future ad-hoc real-run capture session before milestone close
    blocking: false (PROF-03 acceptance is "load and capacity profiles exist in code as showcase examples, but smoke remains the supported first-class workflow" — code presence + green static gates + dry-run resolution satisfy the "example" tier per CONTEXT)
  - id: F-02-lcp-zero-on-smoke-single-iteration
    surface: lib/simulations/smoke.ts handleSummary output
    state: smoke real run captured `browser_web_vital_lcp p(95) = 0ms ✅ PASS` against the 3000ms threshold. Key Metrics table shows `LCP p(95): n/a` (factory n/a fallback) — minor inconsistency between Thresholds and Key Metrics rendering of the same metric.
    rationale: k6 1.5 browser_web_vital_lcp metric on a single-iteration smoke run appears to emit a single sample with value 0 (or no samples; need to check raw JSON). The format-md `n/a` fallback in the Key Metrics row uses the `sample count > 0` check while the Thresholds row trusts k6's threshold-engine boolean. Behavior is internally consistent with the formatter contract but visually surprising.
    recommended_owner: Phase 05 OR a Plan 04-03 polish task — could either tighten the smoke threshold or relax the Key Metrics `n/a` rule to render `0ms` when k6's threshold engine reports a value.
    blocking: false (smoke run still passes; load run shows healthy `482ms` LCP confirming the metric works end-to-end with adequate samples)
metrics:
  duration_minutes: 12  # 6 min code (executor) + 6 min verify-wave (smoke ~1min real + load ~2min real + deviation patch + writes)
  task_count: 4  # Task 1 RED+GREEN, Task 2 scripts+validate-build+cleanup, Task 3 README, Task 4 verify-wave (2/3 real runs captured)
  files_created: 5
  files_modified: 6
  tests_added: 16  # 7 simulations-load + 7 simulations-capacity + 2 perf-runner
  total_tests_after: 112
  commits: 5  # 4aee232 RED + 24c3494 GREEN + d61088c scripts + 48dc37b README + a7a4ad1 deviation
  completed_at: "2026-05-11T21:25:00Z"
---

# Phase 4 Plan 02 Summary — Example Load + Capacity Profiles + Output Surface + Real Evidence

**Phase:** 04 — Example Profiles & Output Surface
**Plan:** 04-02
**Run date:** 2026-05-11
**Runner host:** Windows 11 Pro (10.0.26200), Node 22.20.0, npm 11.6.1, k6 v1.5.0 (commit/7961cefa12, go1.25.5, windows/amd64)
**Target:** https://othrondir.github.io/QAbbalah/ (GitHub Pages demo blog)

---

## Status

| Task | Type | State | Evidence |
|------|------|-------|----------|
| Task 1 (RED+GREEN) | auto | ✅ COMPLETE | Commits `4aee232` (RED — 14 tests authored failing) + `24c3494` (GREEN — load.ts + capacity.ts authored, 14 RED→GREEN). |
| Task 2 | auto | ✅ COMPLETE | Commit `d61088c` — package.json scripts, validate-build strict 6-file list, runtime-config D-18 cleanup, perf-runner.test.mjs +2 tests. |
| Task 3 | auto | ✅ COMPLETE | Commit `48dc37b` — README Quickstart 3-row Supported-vs-Example table per D-13/D-15 verbatim. |
| Task 4 (verify-wave) | checkpoint:human-verify | ✅ EVIDENCE CAPTURED (2/3) | Smoke ✓ + Load ✓ against QAbbalah; capacity deferred (F-01). Deviation D-01 patched in commit `a7a4ad1` mid-verify. |

---

## Verify-Wave Run 1 — Smoke (PROF-04 regression)

**Command:**
```
npm run build
npm run smoke
```

**Outcome:** EXIT 0 — all 3 D-66 thresholds pass; artifacts written.

**Evidence (full markdown artifact verbatim from `reports/smoke-home-smoke.md`):**

```markdown
# smoke run — home-smoke

- Profile: `smoke`
- Scenario: `home-smoke`
- Base URL: https://othrondir.github.io/QAbbalah/
- Run date: 2026-05-11T21:19:21.290Z

## What ran

1 VU, 1 iteration shared-iterations

## Thresholds

| Metric | Bound | Actual | Verdict |
|---|---|---|---|
| `iteration_duration` | `p(95)<15000` | 2255.631ms | ✅ PASS |
| `http_req_failed` | `rate<0.01` | 0.00% | ✅ PASS |
| `browser_web_vital_lcp` | `p(95)<3000` | 0ms | ✅ PASS |

## Key metrics

| Metric | Value |
|---|---|
| LCP p(95) | n/a |
| iteration_duration p(95) | 2255.631ms |
| http_req_failed rate | 0.00% |
| browser_http_req_duration p(95) | 214.4815ms |
| browser_data_received total | 1.82 MB |

---
Raw data: `reports/smoke-home-smoke.json`
```

**Anti-regression observations:**

- `browser_http_req_duration p(95) = 214.4815ms` — the D-03 amendment metric emits real data (>0 samples), confirming RESEARCH §5 Pitfall 1 fix end-to-end. A bare `http_req_duration` would have shown `0ms` here.
- Navigation timings across 3 attempts during verify-wave: 716ms, 881ms, 669ms — consistent with Plan 03-02 baseline (~700ms-1s).
- Deviation D-01 (mkdir reports/) committed BEFORE this run captured the green artifact. Without it the first attempt logged `failed to handle the end-of-test summary` and exited 0 with no files written.

---

## Verify-Wave Run 2 — Load (PROF-02 amended-threshold confirmation)

**Command:**
```
npm run example:load
```

**Outcome:** EXIT 0 — full 2-min ramp completes; 171 iterations across 5 VU peak; all 4 thresholds pass; artifacts written.

**Evidence (full markdown artifact verbatim from `reports/load-home-smoke.md`):**

```markdown
# load run — home-smoke

- Profile: `load`
- Scenario: `home-smoke`
- Base URL: https://othrondir.github.io/QAbbalah/
- Run date: 2026-05-11T21:21:36.894Z

## What ran

5 VUs, ~2 min ramping-vus (30s ramp / 60s hold / 30s ramp down)

## Thresholds

| Metric | Bound | Actual | Verdict |
|---|---|---|---|
| `iteration_duration` | `p(95)<25000` | 2129.44265ms | ✅ PASS |
| `browser_web_vital_lcp` | `p(95)<4000` | 482ms | ✅ PASS |
| `http_req_failed` | `rate<0.05` | 0.00% | ✅ PASS |
| `browser_http_req_duration` | `p(95)<2000` | 145.2852ms | ✅ PASS |

## Key metrics

| Metric | Value |
|---|---|
| LCP p(95) | 482ms |
| iteration_duration p(95) | 2129.44265ms |
| http_req_failed rate | 0.00% |
| browser_http_req_duration p(95) | 145.2852ms |
| browser_data_received total | 311.37 MB |

---
Raw data: `reports/load-home-smoke.json`
```

**Anti-regression observations:**

- `browser_http_req_duration p(95) = 145.29ms < 2000ms` — D-03 amendment is observably correct at load (171 sub-resource samples). The bare `http_req_duration` threshold would have shown `0.00ms` with no samples and silently passed for the wrong reason.
- `browser_web_vital_lcp p(95) = 482ms` — proves LCP captures real data when iteration count is high enough; resolves the F-02 single-iteration concern from the smoke run.
- `http_req_failed: 0.00%` against `<0.05` (5%) — D-04 soft-trip margin honored; zero failures across 171 iterations.
- `iteration_duration p(95) = 2129ms < 25000ms` — comfortably under the 25-second bound; 5-VU shape is sustainable on QAbbalah without backpressure.
- 311.37 MB data received over 2 min — chromium routing through k6/browser is delivering real network traffic (not stubbed).

---

## Verify-Wave Run 3 — Capacity (PROF-03)

**Status:** ⏸ DEFERRED — see F-01.

**Reason:** Recruiter PC showed slowdown after Run 2 (5 VU peak, 171 iterations of chromium). Capacity stage shape (10 VU peak, 4 min total) would have doubled the load. User chose `Saltar capacity, cerrar fase` to avoid destabilizing the session.

**Static gates that DID land for capacity:**

- `lib/simulations/capacity.ts` authored (124 lines, D-14 banner, amended thresholds, factory wired) — commit `24c3494`.
- 7/7 `tests/unit/simulations-capacity.test.mjs` cases pass under `node --test`.
- `dist/simulations/capacity.js` emits cleanly via `npm run build`.
- `npm run validate:build` includes capacity.js in the strict 6-file list — exit 0.
- `npm run example:capacity --dry-run` resolves: `k6 run -e SCENARIO=home-smoke -e BASE_URL=https://othrondir.github.io/QAbbalah/ -e K6_PROFILE=capacity -e K6_SCENARIO=home-smoke -e K6_DEMO=true dist/simulations/capacity.js` — proves perf-runner + runtime-config wiring is healthy.
- `tests/unit/perf-runner.test.mjs::"--profile capacity --dry-run resolves to dist/simulations/capacity.js"` — green.

**What's missing:** Real-run artifact `reports/capacity-home-smoke.{md,json}` against QAbbalah. CONTEXT-D-05 narrative ("recruiter find-the-ceiling story") accepts soft trips, so the artifact is informational, not gate-blocking. PROF-03 acceptance is "exists in code as showcase example" — satisfied.

**Recommended capture path:** A dedicated 5-min slot on a less-loaded machine, or as part of Phase 05 docs polish when the recruiter walkthrough is rehearsed end-to-end.

---

## ROADMAP Success Criteria — Plan 04-02 Scope

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | `lib/simulations/load.ts` exists with EXAMPLE banner + amended thresholds | ✅ | Commit `24c3494`; 7/7 simulations-load tests; build emits `dist/simulations/load.js`. |
| 2 | `lib/simulations/capacity.ts` exists with EXAMPLE banner + amended thresholds | ✅ | Commit `24c3494`; 7/7 simulations-capacity tests; build emits `dist/simulations/capacity.js`. |
| 3 | `npm run example:load` / `example:capacity` scripts wired | ✅ | Commit `d61088c`; package.json:11-12; both resolve to correct entry files in dry-run. |
| 4 | `scripts/validate-build.mjs` strict 6-file list including new entries | ✅ | Commit `d61088c`; `npm run validate:build` exits 0 against `[smoke.js, load.js, capacity.js, perf-runner.mjs, .env.example, runtime-config.ts]`. |
| 5 | `PHASE_ONE_SMOKE_ENTRY_FILE` retired per D-18 | ✅ | Commit `d61088c`; grep across `lib/ scripts/ tests/` returns 0 matches. |
| 6 | README Quickstart 3-row Supported-vs-Example table | ✅ | Commit `48dc37b`; table rendered in README Quickstart section. |
| 7 | Real-run evidence for all 3 first-class profiles vs QAbbalah | ⚠ PARTIAL (2/3) | Smoke ✓ Run 1; Load ✓ Run 2; Capacity deferred (F-01). PROF-03 "example" tier satisfied by static gates. |
| 8 | `browser_http_req_duration` amendment captures real data end-to-end | ✅ | Smoke: 214ms p(95); Load: 145ms p(95) over 171 iters. Bare `http_req_duration` would emit 0ms — RESEARCH Pitfall 1 closed. |
| 9 | Plan 04-01 D-11 artifact-emission contract works on clean clone | ✅ | After D-01 deviation patch (mkdir reports/), both real runs wrote `.md` + `.json` artifacts. Before patch: k6 exits 0 but logs `failed to handle the end-of-test summary` — silent failure caught by verify-wave. |

---

## Test Suite Final State

```
$ node --test --test-reporter=spec tests/unit/*.test.mjs tests/integration/*.test.mjs
ℹ tests 112
ℹ pass 112
ℹ fail 0
```

- Plan 03-02 baseline: 84 tests
- Plan 04-01 additions: +12 (96 total)
- Plan 04-02 additions: +16 (112 total)

---

## Commits

| Commit | Purpose |
|--------|---------|
| `4aee232` | `test(04-02): add RED tests for load + capacity simulation entries` (Wave 0 RED — 14 failing tests) |
| `24c3494` | `feat(04-02): add load.ts + capacity.ts example simulation entries` (Wave 1 GREEN — RED→GREEN) |
| `d61088c` | `feat(04-02): add example:load/capacity scripts, strict validate-build, drop PHASE_ONE_SMOKE_ENTRY_FILE` |
| `48dc37b` | `docs(04-02): add Quickstart Supported-vs-Example table` |
| `a7a4ad1` | `fix(04-02): mkdir reports/ before k6 spawn so handleSummary artifacts can be written` (deviation D-01) |

TDD gate: RED commit `4aee232` precedes all GREEN commits — verified.

---

## What This Plan Enables (Phase 05 + milestone close)

- All 3 first-class profile entries (smoke + load + capacity) build, validate, dry-run, and pass unit tests. Recruiter walkthrough has 3 `npm run` paths to demonstrate.
- `reports/<profile>-<scenario>.{md,json}` artifact-emission contract is observably correct for smoke + load. Capacity inherits the same contract by construction (same factory).
- README Quickstart explicitly labels Supported (smoke) vs Example (load, capacity) per D-13/D-15, matching CONTEXT principle "smoke is supported, load/capacity are illustrative."
- F-01 (capacity real-run) and F-02 (LCP n/a polish) are the only non-blocking follow-ups; both are appropriately scoped for Phase 05.
