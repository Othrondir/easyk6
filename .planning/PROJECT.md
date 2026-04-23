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

### Active

- [ ] `easyPlaywright` page objects become the permanent upstream model for `easyk6`
- [ ] `easyk6` can build k6-compatible test assets from TypeScript-oriented source structure instead of staying a small JS-only demo
- [ ] Smoke browser performance scenarios run against the demo app using reused upstream page objects
- [ ] Load and capacity profiles exist in code as showcase examples, but smoke remains the supported first-class workflow
- [ ] Project structure, runner, and documentation clearly show recruiters the adaptation path from Playwright POM to k6 browser testing

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
| Use `easyPlaywright` as the permanent upstream model | Keeps the showcase grounded in a real Playwright POM source instead of toy selectors | — Pending |
| Adapt `ir-perf-k6` selectively instead of cloning it wholesale | The showcase needs clarity more than enterprise breadth | — Pending |
| Support smoke first, keep load/capacity as examples | This matches the immediate demo goal and keeps v1 executable | — Pending |
| Defer Grafana work until after framework adaptation | Observability only matters once the adapted framework actually runs | — Pending |

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
*Last updated: 2026-04-23 after initialization*
