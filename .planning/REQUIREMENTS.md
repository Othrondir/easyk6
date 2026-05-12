# Requirements: EasyK6

**Defined:** 2026-04-23
**Core Value:** Demonstrate that one Playwright POM source can power maintainable k6 browser smoke tests through a clean architecture that recruiters can read, trust, and run locally

## v1 Requirements

### Upstream Integration

- [x] **UPST-01**: Maintainer can sync Playwright Page Objects from `easyPlaywright` into `easyk6` with a documented scripted command _(completed Phase 02 plan 01, 2026-05-08)_
- [x] **UPST-02**: Synced upstream page objects can be converted into k6-compatible modules without manual locator rewrites inside scenario files _(helpers + K6Page base completed Phase 02 plan 02, 2026-05-08; orchestrator wired end-to-end in Phase 02 plan 03, 2026-05-11; real round-trip against `../easyPlaywright` emits 8 converted POMs)_
- [x] **UPST-03**: k6-specific extensions survive repeated upstream sync/conversion cycles through a preserved patch mechanism _(completed Phase 02 plan 03, 2026-05-11; `lib/pages-k6-patches/HomePage.k6-patch.ts` survives sync→convert→re-sync→re-convert with byte-identical output, proven by `tests/integration/upst-03-roundtrip.test.mjs`)_

### Build And Config

- [x] **BUILD-01**: Developer can build k6 test assets from the adapted project structure with one documented command
- [ ] **BUILD-02**: Developer can configure base URL and other required runtime settings through env files or env vars that fail fast when invalid
- [x] **BUILD-03**: Developer can launch the primary smoke simulation locally through one documented command _(foundation completed Phase 03 plan 01, 2026-05-11; `npm run smoke` resolves to `k6 run -e SCENARIO=home-smoke dist/simulations/smoke.js` via perf-runner + runtime-config + vite/validate-build wiring. Real-run smoke evidence captured in Phase 03 plan 02.)_

### Scenario System

- [x] **SCEN-01**: Repo exposes a central registry of named scenarios instead of only one-off test files _(completed Phase 03 plan 01, 2026-05-11; `lib/scenarios/index.ts` exports `SCENARIO_REGISTRY: Record<string, Scenario>` with `home-smoke` and `blog-post-smoke` kebab-case keys and `{ fn, description, pages }` metadata per entry. Validated by `tests/unit/scenarios-registry.test.mjs` 5 tests.)_
- [ ] **SCEN-02**: Smoke scenarios run simple browser performance journeys against the `easyPlaywright` demo target using reused upstream page objects
- [x] **SCEN-03**: Scenario selection is configurable through CLI or environment without code edits _(foundation completed Phase 03 plan 01, 2026-05-11; perf-runner emits `-e SCENARIO=<id>` on k6 argv (D-61), smoke.ts reads `__ENV.SCENARIO ?? 'home-smoke'` and fail-fasts with `Unknown scenario '<id>'. Available: <csv>` on miss (D-55). Real-run smoke evidence + unknown-scenario fail-fast capture in Phase 03 plan 02.)_

### Profiles And Output

- [x] **PROF-01**: Smoke is the default supported profile with deterministic low-resource settings suitable for demos _(foundation completed Phase 03 plan 01, 2026-05-11; `lib/simulations/smoke.ts` exports `options` with `shared-iterations` executor (D-65), `vus: 1`, `iterations: 1` (D-64), `options.browser.type: 'chromium'`, and D-66 thresholds `browser_web_vital_lcp p(95)<3000` + `http_req_failed rate<0.01` + `iteration_duration p(95)<15000` verbatim. `DEFAULT_PROFILE='smoke'` + `DEFAULT_SCENARIO='home-smoke'` keep smoke the supported first-class workflow. Real-run threshold-pass evidence captured in Phase 03 plan 02.)_
- [ ] **PROF-02**: Load profile code exists as an example within the same runner/config system
- [ ] **PROF-03**: Capacity profile code exists as an example within the same runner/config system
- [ ] **PROF-04**: Smoke execution produces a readable summary or report-ready artifact that helps a reviewer understand what ran _(foundation completed Phase 04 plan 01, 2026-05-11; `lib/simulations/lib/summary.ts` exports `makeHandleSummary({ profile, scenarioGetter, baseUrlGetter })` factory composing pure `formatMarkdown` (D-11 5-section structure) + `formatJson` (`JSON.stringify(data ?? {}, null, 2)`); smoke.ts wired through factory with `profile: 'smoke'` and `__ENV.SCENARIO ?? 'home-smoke'` getter. 12 new unit tests cover D-11 structure, smoke-shape vs load-shape `browser_http_req_duration` fixtures, deterministic JSON, factory key naming, scenarioGetter fallback, POSIX path audit. 96/96 tests GREEN; build + validate-build GREEN. Real-run artifact-emission evidence against QAbbalah owned by Phase 04 plan 02 verify-wave.)_

### Documentation

- [x] **DOCS-01**: README or quickstart explains how Playwright upstream reuse works and how to run the smoke demo locally _(completed Phase 05 plan 01, 2026-05-12; README rewritten top-to-bottom per D-06 with Phase 4 §Quickstart Supported-vs-Example table preserved byte-identical; §Upstream Reuse narrates the 3-step `easyPlaywright` → `src/pages/` → `lib/pages/` → `lib/pages-k6-patches/` pipeline; §Commands documents `npm run smoke` as supported demo path; §Architecture single-paragraph pointer to ARCHITECTURE.md; §Known carry-forward surfaces BUILD-02 / SCEN-02 / F-01 / F-02.)_
- [x] **DOCS-02**: Architecture docs explain which patterns were adapted from `ir-perf-k6` and which were intentionally simplified for recruiter readability _(completed Phase 05 plan 01, 2026-05-12; `ARCHITECTURE.md` authored at repo root per D-04 with 5 H2 sections per D-07: §1 "Adapted from ir-perf-k6" lists scenario registry / TS+Vite / profile-keyed runner / handleSummary factory each with what-got-dropped callout; §2 "Simplified on purpose" lists six explicit rejections (no Grafana, no k8s, no multi-upstream, no scenario matrix, no cloud k6, no CI smoke-on-PR) plus ### Known limitations & deferred work for BUILD-02 / SCEN-02 / F-01 / F-02; §3 folds PROJECT_STRUCTURE.md layout + boundary definitions + sync provenance + legacy-js D-08 callout; §4 documents four k6 1.5 caveats with mitigation file+symbol per caveat citing 03-02-SUMMARY + 04-RESEARCH §5 Pitfall 1; §5 indexes .planning/ as 6-entry pointer list. QUICKSTART.md + CONTRIBUTING.md + PROJECT_STRUCTURE.md deleted; two-file canonical doc set per D-01.)_

## v2 Requirements

### Observability

- **OBS-01**: Repo can export perf metrics into a Grafana-oriented workflow
- **OBS-02**: Docs explain how to stand up and inspect the observability stack

### Framework Expansion

- **FRAME-01**: Repo supports a richer scenario catalog beyond the first smoke journeys
- **FRAME-02**: Repo supports CI execution for smoke demos
- **FRAME-03**: Repo supports more generic upstream-source configuration beyond `easyPlaywright`

## Out of Scope

| Feature | Reason |
|---------|--------|
| Grafana stack in first milestone | Defer until the core adaptation works end to end |
| Generic multi-upstream adapter system | `easyPlaywright` is the permanent upstream model for now |
| Large enterprise scenario matrix | Would add noise without improving recruiter value |
| Kubernetes-first execution | Local-first demo is the priority for this repo |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| BUILD-01 | Phase 1 | Complete |
| BUILD-02 | Phase 1 | Pending |
| UPST-01 | Phase 2 | Complete |
| UPST-02 | Phase 2 | Complete |
| UPST-03 | Phase 2 | Complete |
| BUILD-03 | Phase 3 | Foundation complete (P01), real-run evidence pending (P02) |
| SCEN-01 | Phase 3 | Complete (P01) |
| SCEN-02 | Phase 3 | Pending (P02) |
| SCEN-03 | Phase 3 | Foundation complete (P01), real-run evidence pending (P02) |
| PROF-01 | Phase 3 | Foundation complete (P01), real-run evidence pending (P02) |
| PROF-02 | Phase 4 | Pending |
| PROF-03 | Phase 4 | Pending |
| PROF-04 | Phase 4 | Foundation complete (P01), real-run evidence pending (P02) |
| DOCS-01 | Phase 5 | Complete (P01) |
| DOCS-02 | Phase 5 | Complete (P01) |

**Coverage:**
- v1 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0

---
*Requirements defined: 2026-04-23*
*Last updated: 2026-05-12 after Phase 05 plan 01 (DOCS-01 + DOCS-02 closed: README.md rewritten top-to-bottom preserving Phase 4 Quickstart table byte-identical; ARCHITECTURE.md authored at repo root with 5 H2 sections per D-07; QUICKSTART.md + CONTRIBUTING.md + PROJECT_STRUCTURE.md deleted; package.json description + CLAUDE.md placeholders polished).*
