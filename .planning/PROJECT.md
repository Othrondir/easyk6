# EasyK6

## What This Is

EasyK6 is a recruiter-facing k6 browser performance framework that reuses Playwright Page Objects from `C:\Users\pzhly\Documents\GitHub\easyPlaywright` as the permanent upstream model. Execution patterns and project shape are selectively adapted from `C:\Users\pzhly\Documents\GitHub\ir-perf-k6` — enterprise-only weight rejected on purpose.

Shipped as v1.0 (2026-05-12): a clean, understandable showcase repo where smoke-level browser performance tests actually run against the live `easyPlaywright` demo target, and where load/capacity code exists as illustrative examples sharing the same architecture.

## Current State (v1.0 shipped)

- **Build/runtime:** TypeScript 5.9 + Vite 5.4 + k6 1.5 with browser module; Node 22.x LTS toolchain
- **Source layout:** `src/pages/` (Playwright upstream sync target) → `lib/pages/` (k6-converted) → `lib/pages-k6-patches/` (k6-only extensions) → `lib/scenarios/` (registry) → `lib/simulations/` (smoke/load/capacity entries) → `dist/` (Vite bundle output)
- **Supported demo path:** `npm run smoke` → `k6 run -e SCENARIO=home-smoke dist/simulations/smoke.js` against `https://othrondir.github.io/QAbbalah/` (3/3 D-66 thresholds pass: LCP p95<3s, http_req_failed<1%, iter_duration p95<15s)
- **Example tier:** `npm run example:load` (ramping-vus, ~2 min) + `npm run example:capacity` (ramping-arrival-rate, ~3 min) share the `makeHandleSummary` factory and emit `reports/<profile>-<scenario>.md` + `.json`
- **Documentation:** Two-file canonical set at repo root — `README.md` (Quickstart Supported-vs-Example table + Upstream Reuse pipeline + Architecture pointer) and `ARCHITECTURE.md` (5-section narrative)
- **Test coverage:** 96/96 unit + integration tests green at v1.0 close (no `npm test` script — tests run via direct vitest invocation; gap acknowledged for v2)
- **Carry-forward to v2:** BUILD-02 (broader env validation surface), F-01 (capacity real-run vs demo target), F-02 (LCP `n/a` in single-iteration smoke Key Metrics) — all surfaced honestly in shipped docs per D-09

## Core Value

Demonstrate that one Playwright POM source can power maintainable k6 browser smoke tests through a clean architecture that recruiters can read, trust, and run locally.

## Requirements

### Validated

- ✓ Basic JavaScript k6 framework structure already exists in this repo — existing
- ✓ Current repo already includes reusable page objects, config helpers, and example smoke/load/API test entry points — existing
- ✓ `easyPlaywright` already provides a stable Playwright POM source suitable for reuse — existing
- ✓ `ir-perf-k6` already demonstrates the target direction for scenario registry, profiles, conversion flow, and runner structure — existing
- ✓ `easyk6` can build k6-compatible test assets from TypeScript-oriented source structure instead of staying a small JS-only demo — Phase 1 (BUILD-01, BUILD-02)
- ✓ `easyPlaywright` page objects become the permanent upstream model for `easyk6` — Phase 2 (UPST-01, UPST-02, UPST-03): documented `npm run sync:src` path, byte-deterministic `npm run convert-pages` orchestrator with vendored `k6-testing`, and a survivable `lib/pages-k6-patches/` mechanism that round-trips through sync→convert→re-sync→re-convert without drift
- ✓ Smoke browser performance scenarios run against the demo app using reused upstream page objects — Phase 3 (SCEN-01, SCEN-02, SCEN-03, BUILD-03, PROF-01): scenario registry + smoke entry + real `npm run smoke` against QAbbalah passing all 3 thresholds
- ✓ Load and capacity profiles exist in code as showcase examples, but smoke remains the supported first-class workflow — Phase 4 (PROF-02, PROF-03, PROF-04): `npm run example:load` + `npm run example:capacity` + shared `makeHandleSummary` factory + Quickstart Supported-vs-Example table
- ✓ Project structure, runner, and documentation clearly show recruiters the adaptation path from Playwright POM to k6 browser testing — Phase 5 (DOCS-01, DOCS-02): README rewritten + ARCHITECTURE.md authored at repo root with 5-section narrative (Adapted / Simplified on purpose / Upstream reuse pipeline / k6 1.5 caveats / Decision log) + stale docs deleted

### Active

(none — milestone v1.0 closed 2026-05-12. v2.0 scope not yet defined; run `/gsd-new-milestone` to scope.)

### Next Milestone Goals (v2.0 — likely scope, not yet committed)

Pulled from `milestones/v1.0-REQUIREMENTS.md` §v2 + v1 carry-forward:

- **BUILD-02** — Close the broader env validation fail-fast surface (v1 carry-forward)
- **F-01** — Capture `npm run example:capacity` real-run evidence vs demo target (v1 deferred)
- **OBS-01 / OBS-02** — Grafana / OTEL observability stack + docs
- **FRAME-01** — Richer scenario catalog beyond the first smoke journeys
- **FRAME-02** — CI execution for smoke demos
- **FRAME-03** — Generic upstream-source configuration beyond `easyPlaywright`

### Out of Scope

- Full Grafana or OTEL integration in this first milestone — defer until framework adaptation is working
- Generic support for any arbitrary external Playwright repo — `easyPlaywright` is the permanent upstream model for now
- Copying all enterprise complexity from `ir-perf-k6` — keep only the parts that improve maintainability and readability
- Large multi-team scenario catalog — this repo only needs enough realistic scenarios to demonstrate capability well

## Context

- Current repo is a simple k6 example project with JavaScript files under `pages/`, `tests/`, `utils/`, and `config/`
- `ir-perf-k6` is the reference for architecture patterns: scenario registry, runner CLI, TypeScript/Vite build, converted page layers, smoke/load/capacity profiles, and report-oriented execution
- `easyPlaywright` is the permanent upstream source for Playwright Page Objects and fixtures
- The repo is meant to help its owner show capability to recruiters while searching for work
- Success means a reviewer can understand the architecture quickly and run a real smoke flow without reverse-engineering the repo
- Grafana is interesting future work, but only after the core adaptation proves out

## Constraints

- **Upstream source of truth**: `easyPlaywright` page objects define the long-term object model
- **Reference architecture**: Reuse good ideas from `ir-perf-k6`, but do not inherit enterprise-only weight that hurts recruiter readability
- **Execution scope**: Smoke must work end to end; load and capacity may remain example code in this milestone
- **Showcase quality**: Naming, folder structure, docs, and commands must be understandable to a technical reviewer without private company context
- **Local-first workflow**: The repo should be runnable locally without needing Kubernetes, cloud infra, or internal services

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use `easyPlaywright` as the permanent upstream model | Keeps the showcase grounded in a real Playwright POM source instead of toy selectors | Validated — Phase 2 sync→convert→patch pipeline (UPST-01..03); recruiter-readable provenance via `.sync-meta.json` |
| Adapt `ir-perf-k6` selectively instead of cloning it wholesale | The showcase needs clarity more than enterprise breadth | Validated — Phase 5 ARCHITECTURE.md §1 (Adapted) + §2 (Simplified on purpose) document the explicit splits |
| Support smoke first, keep load/capacity as examples | This matches the immediate demo goal and keeps v1 executable | Validated — Phase 3 supported `npm run smoke` + Phase 4 example load/capacity behind the same factory; README Quickstart Supported-vs-Example table |
| Defer Grafana work until after framework adaptation | Observability only matters once the adapted framework actually runs | Validated — deferred + surfaced honestly per D-09 in README §Known carry-forward + ARCHITECTURE.md §2 ### Known limitations & deferred work |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `$gsd-transition`):
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone** (via `$gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check -> still the right priority?
3. Audit Out of Scope -> reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-12 at milestone v1.0 close — 5 phases, 11 plans, 14/15 v1 requirements complete (BUILD-02 carried forward to v2). Full archive: `milestones/v1.0-ROADMAP.md`.*
