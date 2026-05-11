---
phase: 3
slug: smoke-scenarios-supported-execution
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-11
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Sourced from RESEARCH.md §6.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node:test` (Node 22 built-in) — already in use across Phase 1 + 2 |
| **Config file** | None — test discovery is per-script `node --test <path>` |
| **Quick run command** | `node --test tests/unit/scenarios-registry.test.mjs tests/unit/runtime-config.test.mjs tests/unit/perf-runner.test.mjs` |
| **Full suite command** | `node --test tests/unit/*.test.mjs tests/integration/*.test.mjs && npm run build && npm run validate:build` |
| **Estimated runtime** | ~15 seconds (unit + build), ~30s (full + integration) |

---

## Sampling Rate

- **After every task commit:** Run quick command above
- **After every plan wave:** Run full suite command
- **Before `/gsd-verify-work`:** Full suite green + real `npm run smoke` against `https://othrondir.github.io/QAbbalah/` exits 0 with thresholds passing
- **Max feedback latency:** 15 seconds (quick), 30 seconds (full)

---

## Per-Task Verification Map

> Task IDs match the planner's finalized task numbers in `03-01-PLAN.md` and `03-02-PLAN.md`. Where one planner task addresses multiple requirements, the same task ID appears in multiple rows (e.g., `03-01-T05` covers SCEN-03 + PROF-01).

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-T01 | 01 | 0 | — | — | N/A — Wave 0 RED test stub | wave-0 stub | `node --test tests/unit/scenarios-registry.test.mjs` | ❌ W0 | ⬜ pending |
| 03-01-T07 | 01 | 1 | BUILD-03 | — | runner invokes k6 with `-e SCENARIO=<id>` argv | unit | `node --test tests/unit/perf-runner.test.mjs` | ✅ needs new assertion | ⬜ pending |
| 03-01-T06 | 01 | 1 | BUILD-03 | — | `resolveEntryFile` returns `dist/simulations/<profile>.js` | unit | `node --test tests/unit/runtime-config.test.mjs` | ✅ needs regex update | ⬜ pending |
| 03-01-T04 | 01 | 1 | SCEN-01 | — | `SCENARIO_REGISTRY` exports `home-smoke` and `blog-post-smoke` with `{ fn, description, pages }` keys — references the RED test from 03-01-T01 | unit | `node --test tests/unit/scenarios-registry.test.mjs` | ❌ W0 (test from T01) | ⬜ pending |
| 03-01-T05 | 01 | 1 | SCEN-03 | — | Unknown `__ENV.SCENARIO` exits non-zero with `Unknown scenario '<id>'. Available: ...` listing — references the RED test from 03-01-T01 | unit | `node --test tests/unit/scenarios-registry.test.mjs` | ❌ W0 (test from T01) | ⬜ pending |
| 03-01-T05 | 01 | 1 | PROF-01 | — | smoke options literally `{ vus:1, iterations:1, executor:'shared-iterations', browser:{type:'chromium'}, thresholds:{browser_web_vital_lcp p(95)<3000, http_req_failed rate<0.01, iteration_duration p(95)<15000} }` — references the RED test from 03-01-T01 | static | `node --test tests/unit/scenarios-registry.test.mjs` (options block) | ❌ W0 (test from T01) | ⬜ pending |
| 03-01-T08 | 01 | 1 | BUILD-03 | — | Vite builds `dist/simulations/smoke.js` and `validate:build` finds it | build-time | `npm run build && npm run validate:build` | ✅ exists, needs entry add | ⬜ pending |
| 03-01-T02 | 01 | 1 | (UPST follow-up) | — | Converter strips dangling `import { BasePage } from './BasePage'` from generated POMs | unit | `node --test tests/unit/convert-transforms.test.mjs` (new R6a assertion) | ✅ exists, needs new test case | ⬜ pending |
| 03-01-T02c | 01 | 1 | (UPST follow-up) | — | `lib/pages/BasePage.ts` passthrough resolves Vite when generated POMs still reference `./BasePage` | build-time | `npm run build` (compile passes) | ❌ W0 (3-line file authored in T02 sub-step c) | ⬜ pending |
| 03-01-T02d + T03 | 01 | 1 | (UPST follow-up) | — | `.gitkeep` survives `sync-src` + `convert-pages` runs (T02d wires the convert-pages skip + test; T03 wires the sync-src skip + test) | unit | `node --test tests/unit/sync-src.test.mjs tests/unit/convert-pages.test.mjs` (new assertions) | ✅ exists, needs new test cases | ⬜ pending |
| 03-02-T01 | 02 | 2 | SCEN-02 | — | `home-smoke.ts` AND `blog-post-smoke.ts` exist with the locked invariants (HomePage.measureNavigation + 2-3 visibility checks for home-smoke; HomePage + PostPage with 2 sleep(1) + 2 PostPage visibility waits for blog-post-smoke) AND `lib/scenarios/index.ts` no longer holds placeholder fn bodies | static + smoke | static: registry-shape test (`node --test tests/unit/scenarios-registry.test.mjs`); real-run evidence captured by 03-02-T02 | ❌ W0 (authored in 03-02-T01) | ⬜ pending |
| 03-02-T02 | 02 | 2 | BUILD-03, SCEN-02, SCEN-03, PROF-01 | — | Real `npm run smoke` against `https://othrondir.github.io/QAbbalah/` exits 0 with all three D-66 thresholds passing (Run 1 — home-smoke); real `npm run perf -- --scenario blog-post-smoke --demo` exits 0 (Run 2); real `npm run perf -- --scenario does-not-exist --demo` exits non-zero with the SCEN-03 fail-fast message on stderr (Run 3). All three runs captured in `03-02-SUMMARY.md`. | smoke (real k6) — MANUAL | `npm run build && npm run smoke` (Run 1); `npm run perf -- --profile smoke --scenario blog-post-smoke --demo` (Run 2); `npm run perf -- --profile smoke --scenario does-not-exist --demo` (Run 3) — evidence pasted into SUMMARY | manual | ⬜ pending |
| 03-02-T03 | 02 | 2 | BUILD-03 (cleanup) | — | Phase 1 `k6/simulations/smoke/smoke-shell.test.ts` is DELETED; `scripts/validate-build.mjs` no longer lists `dist/tests/smoke/smoke-shell.test.js`; `npm run build && npm run validate:build` exits 0; `dist/simulations/smoke.js` is the SOLE smoke artifact | unit + build | `node --test tests/unit/*.test.mjs tests/integration/*.test.mjs && npm run build && npm run validate:build` | ✅ exists, needs update | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/unit/scenarios-registry.test.mjs` — covers SCEN-01, SCEN-03 (registry lookup + unknown-ID), partial PROF-01 (smoke-options introspection). Authored in 03-01-T01 (RED) before any production file exists.
- [x] `lib/pages/BasePage.ts` — 3-line passthrough: `export { K6Page as BasePage } from './base/base-page';` (RESEARCH §3, belt-and-suspenders alongside converter strip). Authored in 03-01-T02 sub-step (c).
- [x] `lib/scenarios/index.ts` — `SCENARIO_REGISTRY` map skeleton + `Scenario`/`ScenarioFn`/`ScenarioContext` type exports. Authored in 03-01-T04.
- [x] `lib/simulations/smoke.ts` — hand-authored simulation entry (NOT generated, no banner; future template for Phase 4 load/capacity). Authored in 03-01-T05.
- [x] `lib/scenarios/home-smoke.ts`, `lib/scenarios/blog-post-smoke.ts` — scenario implementations. Authored in 03-02-T01.
- [x] New test assertions inside existing files: `tests/unit/perf-runner.test.mjs` (`-e SCENARIO=` argv) — 03-01-T07; `tests/unit/runtime-config.test.mjs` (entry-path regex) — 03-01-T06; `tests/unit/convert-transforms.test.mjs` (BasePage strip rule) — 03-01-T02; `tests/unit/sync-src.test.mjs` (`.gitkeep` preservation) — 03-01-T03; `tests/unit/convert-pages.test.mjs` (`.gitkeep` + `BasePage.ts` preservation) — 03-01-T02.

*No new framework install required. `node:test` + the `ts.transpileModule` data-URL loader pattern is already established in `tests/unit/k6page-base.test.mjs`.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions | Owning Task |
|----------|-------------|------------|-------------------|-------------|
| Real `npm run smoke` exits 0 with thresholds passing against QAbbalah | BUILD-03, SCEN-02, PROF-01 | Requires live network + GitHub Pages target; not deterministic enough for CI gate; recruiter narrative demands evidence of a real run | 1) `npm run build`. 2) `npm run smoke`. 3) Capture stdout (executor `shared-iterations`, `iterations: 1`, threshold lines). 4) Confirm exit 0. 5) Paste tail into 03-02-SUMMARY.md. | 03-02-T02 (Run 1) |
| `blog-post-smoke` real run | SCEN-02 | Same as above; second journey hits `HomePage` → `PostPage` | `npm run perf -- --profile smoke --scenario blog-post-smoke --demo`; confirm exit 0 and that `PostPage` visibility assertions fire (visible in console). | 03-02-T02 (Run 2) |
| Unknown-scenario fast-fail in real runner | SCEN-03 | Confirms the runner CLI surface, not the registry alone | `npm run perf -- --profile smoke --scenario does-not-exist --demo`; confirm non-zero exit, stderr contains `Unknown scenario 'does-not-exist'. Available: home-smoke, blog-post-smoke`. | 03-02-T02 (Run 3) |

---

## Nyquist Honesty Note

`vus: 1, iterations: 1` is N=1 sampling. Threshold values (`p(95)<3000ms` LCP, `p(95)<15000ms` iteration) are deliberately loose to survive single-iteration variance + GitHub Pages cold cache + home Wi-Fi noise (RESEARCH §6.5). This phase asserts **"smoke ran end-to-end with a real pass/fail"** — it does NOT claim to detect performance regressions. Phase 4 load/capacity profiles supply higher VU counts where p(95) becomes meaningful.

If Plan 03-02 sees LCP flake during validation, the documented mitigation is to raise the LCP threshold to `p(95)<4000`. Do not pre-warm the demo target — the recruiter narrative depends on a fresh run.

---

## Validation Sign-Off

- [x] All tasks have automated verify OR Wave 0 dependencies OR an entry in the Manual-Only table
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s (full suite)
- [x] `nyquist_compliant: true` set in frontmatter (final per-task map approved by checker — see Per-Task Verification Map above)

**Approval:** approved — final per-task map locked, frontmatter `nyquist_compliant`/`wave_0_complete` both `true`.
