---
phase: 3
slug: smoke-scenarios-supported-execution
status: draft
nyquist_compliant: false
wave_0_complete: false
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

> Task IDs are placeholders — gsd-planner will finalize them. Mapping is by requirement and intended plan/wave.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-W0 | 01 | 0 | — | — | N/A | wave-0 stub | `node --test tests/unit/scenarios-registry.test.mjs` | ❌ W0 | ⬜ pending |
| 03-01-01 | 01 | 1 | BUILD-03 | — | runner invokes k6 with `-e SCENARIO=<id>` argv | unit | `node --test tests/unit/perf-runner.test.mjs` | ✅ needs new assertion | ⬜ pending |
| 03-01-02 | 01 | 1 | BUILD-03 | — | `resolveEntryFile` returns `dist/simulations/<profile>.js` | unit | `node --test tests/unit/runtime-config.test.mjs` | ✅ needs regex update | ⬜ pending |
| 03-01-03 | 01 | 1 | SCEN-01 | — | `SCENARIO_REGISTRY` exports `home-smoke` and `blog-post-smoke` with `{ fn, description, pages }` keys | unit | `node --test tests/unit/scenarios-registry.test.mjs` | ❌ W0 | ⬜ pending |
| 03-01-04 | 01 | 1 | SCEN-03 | — | Unknown `--scenario` exits non-zero with available-IDs listing | unit | `node --test tests/unit/scenarios-registry.test.mjs` | ❌ W0 | ⬜ pending |
| 03-01-05 | 01 | 1 | PROF-01 | — | smoke options literally `{ vus:1, iterations:1, executor:'shared-iterations', browser:{type:'chromium'}, thresholds:{browser_web_vital_lcp, http_req_failed, iteration_duration} }` | static | `node --test tests/unit/scenarios-registry.test.mjs` (smoke-options block) OR new `tests/unit/smoke-options.test.mjs` | ❌ W0 | ⬜ pending |
| 03-01-06 | 01 | 1 | BUILD-03 | — | Vite builds `dist/simulations/smoke.js` and `validate:build` finds it | build-time | `npm run build && npm run validate:build` | ✅ exists, needs entry add | ⬜ pending |
| 03-01-07 | 01 | 1 | (UPST follow-up) | — | Converter strips dangling `import { BasePage } from './BasePage'` from generated POMs | unit | `node --test tests/unit/convert-transforms.test.mjs` (new assertion) | ✅ exists, needs new test case | ⬜ pending |
| 03-01-08 | 01 | 1 | (UPST follow-up) | — | `lib/pages/BasePage.ts` passthrough resolves Vite when generated POMs still reference `./BasePage` | build-time | `npm run build` (compile passes) | ❌ W0 (3-line file) | ⬜ pending |
| 03-01-09 | 01 | 1 | (UPST follow-up) | — | `.gitkeep` survives `sync-src` + `convert-pages` runs | unit | `node --test tests/unit/sync-src.test.mjs tests/unit/convert-pages.test.mjs` (new assertions) | ✅ exists, needs new test cases | ⬜ pending |
| 03-02-01 | 02 | 2 | SCEN-02 | — | `home-smoke.ts` exists; invokes `homePage.navigate()` + 2-3 visibility assertions via `K6PlaywrightSelectors` + `measureNavigation()` | static + smoke | static: introspection in registry test; smoke: real `npm run smoke -- --scenario home-smoke` exits 0 | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 2 | SCEN-02 | — | `blog-post-smoke.ts` exists; navigates `HomePage` then `PostPage` with visibility assertions | static + smoke | static: introspection in registry test; smoke: real `npm run perf -- --profile smoke --scenario blog-post-smoke --demo` exits 0 | ❌ W0 | ⬜ pending |
| 03-02-03 | 02 | 2 | BUILD-03, SCEN-02, PROF-01 | — | Real `npm run smoke` against `https://othrondir.github.io/QAbbalah/` exits 0; thresholds (`browser_web_vital_lcp p(95)<3000`, `http_req_failed rate<0.01`, `iteration_duration p(95)<15000`) pass | smoke (real k6) | `npm run smoke` (manual evidence captured in SUMMARY.md) | manual | ⬜ pending |
| 03-02-04 | 02 | 2 | SCEN-03 | — | `--scenario does-not-exist --demo` exits non-zero with `Unknown scenario 'does-not-exist'. Available: home-smoke, blog-post-smoke` on stderr | smoke (real runner) | `npm run perf -- --profile smoke --scenario does-not-exist --demo` (manual evidence) | manual | ⬜ pending |
| 03-02-05 | 02 | 2 | BUILD-03 (cleanup) | — | Phase 1 `k6/simulations/smoke/smoke-shell.test.ts` is deleted; `validate:build` updated; `DEFAULT_SCENARIO` constant in `runtime-config.ts` is `'home-smoke'` | unit + build | `node --test tests/unit/runtime-config.test.mjs && npm run validate:build` | ✅ exists, needs update | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/scenarios-registry.test.mjs` — covers SCEN-01, SCEN-03 (registry lookup + unknown-ID), partial PROF-01 (smoke-options introspection)
- [ ] `lib/pages/BasePage.ts` — 3-line passthrough: `export { K6Page as BasePage } from './base/base-page';` (RESEARCH §3, belt-and-suspenders alongside converter strip)
- [ ] `lib/scenarios/index.ts` — `SCENARIO_REGISTRY` map skeleton + `Scenario` type
- [ ] `lib/simulations/smoke.ts` — hand-authored simulation entry (NOT generated, no banner; future template for Phase 4 load/capacity)
- [ ] `lib/scenarios/home-smoke.ts`, `lib/scenarios/blog-post-smoke.ts` — scenario implementations
- [ ] New test assertions inside existing files: `tests/unit/perf-runner.test.mjs` (`-e SCENARIO=` argv), `tests/unit/runtime-config.test.mjs` (entry-path regex), `tests/unit/convert-transforms.test.mjs` (BasePage strip rule), `tests/unit/sync-src.test.mjs` + `tests/unit/convert-pages.test.mjs` (`.gitkeep` preservation)

*No new framework install required. `node:test` + `ts.transpileModule` data-URL loader pattern is already established in `k6page-base.test.mjs`.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real `npm run smoke` exits 0 with thresholds passing against QAbbalah | BUILD-03, SCEN-02, PROF-01 | Requires live network + GitHub Pages target; not deterministic enough for CI gate; recruiter narrative demands evidence of a real run | 1) `npm run build`. 2) `npm run smoke`. 3) Capture stdout (executor `shared-iterations`, `iterations: 1`, threshold lines). 4) Confirm exit 0. 5) Paste tail into 03-02 plan's verification evidence / SUMMARY.md. |
| `blog-post-smoke` real run | SCEN-02 | Same as above; second journey hits `HomePage` → `PostPage` | `npm run perf -- --profile smoke --scenario blog-post-smoke --demo`; confirm exit 0 and that `PostPage` visibility assertions fire (visible in console). |
| Unknown-scenario fast-fail in real runner | SCEN-03 | Confirms the runner CLI surface, not the registry alone | `npm run perf -- --profile smoke --scenario does-not-exist --demo`; confirm non-zero exit, stderr contains `Unknown scenario 'does-not-exist'. Available: home-smoke, blog-post-smoke`. |

---

## Nyquist Honesty Note

`vus: 1, iterations: 1` is N=1 sampling. Threshold values (`p(95)<3000ms` LCP, `p(95)<15000ms` iteration) are deliberately loose to survive single-iteration variance + GitHub Pages cold cache + home Wi-Fi noise (RESEARCH §6.5). This phase asserts **"smoke ran end-to-end with a real pass/fail"** — it does NOT claim to detect performance regressions. Phase 4 load/capacity profiles supply higher VU counts where p(95) becomes meaningful.

If Plan 03-02 sees LCP flake during validation, the documented mitigation is to raise the LCP threshold to `p(95)<4000`. Do not pre-warm the demo target — the recruiter narrative depends on a fresh run.

---

## Validation Sign-Off

- [ ] All tasks have automated verify OR Wave 0 dependencies OR an entry in the Manual-Only table
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s (full suite)
- [ ] `nyquist_compliant: true` set in frontmatter (after final task map is approved by checker)

**Approval:** pending
