# EasyK6

## What This Is

EasyK6 is a recruiter-facing k6 browser performance framework that adapts this simple starter repo into a more serious architecture. It reuses Playwright Page Objects from `C:\Users\pzhly\Documents\GitHub\easyPlaywright` as the permanent upstream model, while borrowing the execution patterns and project shape that proved useful in `C:\Users\pzhly\Documents\GitHub\ir-perf-k6`.

The first milestone is not "enterprise perf platform." It is a clean, understandable showcase repo where smoke-level browser performance tests actually run, and where load/capacity code exists as illustrative examples of how the framework scales.

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

(none — all milestone v1.0 requirements validated)

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
*Last updated: 2026-05-12 after Phase 5 — milestone v1.0 complete (all 5 phases, 11/11 plans, all phase requirements validated)*
