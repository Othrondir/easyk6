---
phase: 4
slug: example-profiles-output-surface
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-11
approved: 2026-05-11
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node built-in `node --test` (`tests/unit/*.test.mjs`, `tests/integration/*.test.mjs`) — established Phase 1–3 pattern |
| **Config file** | none — entries discovered by `npm test` glob |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test && npm run build && npm run validate:build` |
| **Estimated runtime** | ~12 seconds (84/84 Phase 3 baseline + new Phase 4 cases) |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test && npm run build && npm run validate:build`
- **Before `/gsd-verify-work`:** Full suite green PLUS real `npm run smoke` / `npm run example:load` / `npm run example:capacity` against QAbbalah demo target (recruiter evidence)
- **Max feedback latency:** ~12 seconds for unit/integration; real-browser runs cost minutes (load ~2 min, capacity ~3 min)

---

## Per-Task Verification Map

> Filled by the planner once tasks land. Each row maps a Phase 4 task to a falsifiable signal. Wave 0 owns the empirical k6/browser metric verification AND the pure-function formatter test scaffolds before any locked simulation file is authored.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-W0-01 | 01 | 0 | PROF-02 / PROF-03 | — | k6/browser populates `browser_http_req_duration` (sample count > 0) when home-smoke runs under a 1-VU ramping-vus draft | manual (exploratory k6 run) | `node scripts/perf-runner.mjs --profile load --demo` against draft `load.ts` | ❌ W0 (draft simulation file) | ⬜ pending |
| 04-01-W0-02 | 01 | 0 | PROF-04 | — | Pure markdown formatter renders D-11 columns with deterministic input | unit | `node --test tests/unit/summary-format-md.test.mjs` | ❌ W0 (test + formatter module) | ⬜ pending |
| 04-01-W0-03 | 01 | 0 | PROF-04 | — | Pure JSON formatter serializes `data` deterministically (sorted keys / stable indent) | unit | `node --test tests/unit/summary-format-json.test.mjs` | ❌ W0 | ⬜ pending |
| 04-01-W1-01 | 01 | 1 | PROF-04 | — | `makeHandleSummary({ profile: 'smoke' })` returns a function whose output map keys are `reports/smoke-<scenario>.md` + `reports/smoke-<scenario>.json` | unit | `node --test tests/unit/summary-factory.test.mjs` | ❌ W1 | ⬜ pending |
| 04-01-W1-02 | 01 | 1 | PROF-04 | — | Smoke regression — `lib/simulations/smoke.ts` consumes `makeHandleSummary` and existing smoke tests stay green | unit | `npm test` (Phase 3 baseline 84/84 must hold) | ✅ | ⬜ pending |
| 04-01-W2-01 | 01 | 2 | PROF-02 | — | `lib/simulations/load.ts` exports `options` with `ramping-vus` 3-stage shape per D-01 and D-03 threshold strings (including `browser_http_req_duration`) | unit | `node --test tests/unit/simulations-load.test.mjs` (asserts options literal via the Phase 3 multi-source data-URL loader pattern) | ❌ W2 | ⬜ pending |
| 04-01-W2-02 | 01 | 2 | PROF-03 | — | `lib/simulations/capacity.ts` exports `options` with `ramping-arrival-rate` per D-06/D-07 and D-08 threshold strings | unit | `node --test tests/unit/simulations-capacity.test.mjs` | ❌ W2 | ⬜ pending |
| 04-01-W2-03 | 01 | 2 | PROF-02 / PROF-03 | — | `npm run build` emits `dist/simulations/load.js` AND `dist/simulations/capacity.js` (Vite glob auto-pickup per Phase 3 D-62) | build | `npm run build && test -f dist/simulations/load.js && test -f dist/simulations/capacity.js` | ❌ W2 | ⬜ pending |
| 04-01-W2-04 | 01 | 2 | PROF-02 / PROF-03 | — | `scripts/validate-build.mjs::requiredFiles` extended (strict) to include both new dist entries — fails fast if either is missing | unit | `node --test tests/unit/validate-build.test.mjs` (existing) + `npm run validate:build` after build | ❌ W2 | ⬜ pending |
| 04-01-W2-05 | 01 | 2 | PROF-02 / PROF-03 | — | `package.json` has `example:load` + `example:capacity` scripts dispatching through `perf-runner.mjs --profile <p>` | unit | `node --test tests/unit/package-scripts.test.mjs` (new — asserts script presence + content) | ❌ W2 | ⬜ pending |
| 04-01-W2-06 | 01 | 2 | PROF-02 / PROF-03 | — | `PHASE_ONE_SMOKE_ENTRY_FILE` constant removed from `lib/config/runtime-config.ts` and no consumer references it | unit | `npm test` + `grep -r PHASE_ONE_SMOKE_ENTRY_FILE lib tests scripts \| wc -l` returns 0 | ❌ W2 | ⬜ pending |
| 04-01-W2-07 | 01 | 2 | DOCS placeholder (Phase 5 polishes prose) | — | README quickstart contains the 3-row Supported-vs-Example table contract per D-13/D-15 | unit | `node --test tests/unit/readme-quickstart-table.test.mjs` (new — asserts table presence + 3 expected rows) | ❌ W2 | ⬜ pending |
| 04-01-V-01 | 01 | verify | PROF-02 | — | Real `npm run example:load -- --demo` exits 0, writes `reports/load-home-smoke.md` AND `reports/load-home-smoke.json`, completes the full ramp, markdown contains all 4 D-03 thresholds | manual (recruiter evidence) | `npm run example:load -- --demo` against https://othrondir.github.io/QAbbalah/ — capture stdout + both report files in SUMMARY.md | ❌ verify | ⬜ pending |
| 04-01-V-02 | 01 | verify | PROF-03 | — | Real `npm run example:capacity -- --demo` exits 0 (soft thresholds allow trip), completes ramp, markdown narrates which thresholds tripped at which point | manual | `npm run example:capacity -- --demo` — capture report pair + stdout | ❌ verify | ⬜ pending |
| 04-01-V-03 | 01 | verify | PROF-04 | — | Real `npm run smoke` STILL exits 0 (regression — Phase 3 contract intact) and now writes `reports/smoke-home-smoke.md` + `.json` | manual | `npm run smoke` — capture report pair, diff smoke threshold values against Phase 3 03-02-SUMMARY values | ❌ verify | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/summary-format-md.test.mjs` — pure markdown formatter tests (RED). Fixtures: smoke-shape data (0-sample `browser_http_req_duration`) AND load-shape data (real samples). Validates D-11 column structure + `n/a (no samples)` graceful-degradation path
- [ ] `tests/unit/summary-format-json.test.mjs` — pure JSON formatter tests (RED). Deterministic stable-indent assertion
- [ ] Draft `lib/simulations/load.ts` (exploratory; not the final file) — used ONLY to confirm `browser_http_req_duration` has sample count > 0 in a real run. Discarded or evolved into the final file in Wave 2
- [ ] Manual run record — capture stdout from the exploratory `node scripts/perf-runner.mjs --profile load --demo` invocation in the plan's deviation log if findings diverge from research expectations

*Wave 0 closes once: (a) `browser_http_req_duration` sample-count > 0 confirmed empirically, (b) formatter RED tests are committed and failing for the documented reasons.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Load profile completes 2-minute ramp against demo target | PROF-02 | k6/browser real-run; can't simulate chromium in Node unit tests | `npm run example:load -- --demo`; expect non-zero VUs over peak window, full 2-min runtime, exit code 0 (or 99 if soft thresholds trip — recruiter evidence either way) |
| Capacity profile trips at least one threshold near the ceiling | PROF-03 | Real-target throughput discovery is the entire point; can't unit-test | `npm run example:capacity -- --demo`; the run completes the full 3-min ramp; the markdown report names which threshold tripped at approximately which iter/s rate |
| Smoke regression — markdown report writes successfully alongside the existing Phase 3 stdout signals | PROF-04 | `handleSummary` runs only inside k6 — Node tests can't exercise the path end-to-end | `npm run smoke` against QAbbalah; `reports/smoke-home-smoke.md` exists post-run; markdown opens cleanly on GitHub; LCP/iter/http_req_failed thresholds still PASS per Phase 3 D-66 |
| Recruiter readability of `reports/<profile>-<scenario>.md` | PROF-04 | Aesthetic / clarity judgment beyond grep-verifiable structure | Open each of the 3 report markdowns in a Markdown previewer / GitHub web UI; confirm header → "What ran" → thresholds table → key metrics → footer reads top-to-bottom in ≤30 seconds without context |
| Cross-platform path keys in `handleSummary` return map | PROF-04 | k6 binary writes the files; can't assert on a single OS | At minimum confirm POSIX-forward-slash keys (`reports/load-home-smoke.md`) work on the developer's primary OS; record OS + k6 version in SUMMARY.md provenance footer |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies — plan-checker confirmed (verdict ~2026-05-11)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify — confirmed against Plans 04-01 + 04-02
- [x] Wave 0 covers all MISSING references — RED formatter tests live in Plan 04-01 Task 1; empirical `browser_http_req_duration` confirm folded into Plan 04-02 Task 4 verify-wave per CONTEXT amendment lock
- [x] No watch-mode flags
- [x] Feedback latency < 15 seconds for the unit/integration loop
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-11 (pre-execution structural sign-off; wave_0_complete flips after Plan 04-01 RED tests land)
