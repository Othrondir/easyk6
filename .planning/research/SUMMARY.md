# Project Research Summary

**Project:** EasyK6
**Domain:** Showcase k6 browser framework reusing Playwright Page Objects
**Researched:** 2026-04-23
**Confidence:** HIGH

## Executive Summary

EasyK6 should not become a smaller clone of `ir-perf-k6`. The right approach is to keep the repo easy to read and easy to run while proving a technically stronger idea: Playwright Page Objects from `easyPlaywright` can be synchronized, converted, and executed in k6 browser smoke flows through a disciplined architecture.

Research shows the strongest v1 shape is local-first, smoke-first, and architecture-first. Use a TypeScript + Vite build path, a generated k6 page layer plus persistent patches, a scenario registry, and a small runner with profiles. Keep load and capacity in code as examples. Defer Grafana until the adapted framework itself is stable.

## Key Findings

### Recommended Stack

Use k6 with the browser module, Node.js 22.x, TypeScript 5.9.x, and Vite 5.4.x. That combination matches the strongest parts of the reference repo while remaining modern and understandable. Official k6 docs also reinforce two important points: browser testing is a first-class use case, and native TS support is partial enough that external bundling still makes sense for richer project structures.

**Core technologies:**
- k6 browser module: browser-level performance execution and web vitals
- TypeScript: safer adaptation of upstream Playwright concepts into k6-safe modules
- Vite: repeatable bundling for a structured repo
- dotenv + runner CLI: clean local execution surface

### Expected Features

The must-have features are scripted upstream sync, k6-compatible page conversion, named smoke scenarios, env validation, and clear recruiter-oriented docs. The strongest differentiators are selective reuse of `ir-perf-k6` patterns and example load/capacity profiles that demonstrate depth without complicating the primary smoke workflow.

**Must have (table stakes):**
- Scripted sync from `easyPlaywright`
- Generated k6-compatible page layer with persistent patches
- Scenario registry and runnable smoke profile
- Centralized config/env validation
- Clear quickstart and architecture explanation

**Should have (competitive):**
- Example load and capacity profiles
- Structured summary artifacts
- Strong architecture narrative for recruiters

**Defer (v2+):**
- Grafana integration
- CI workflow
- Generic multi-upstream support

### Architecture Approach

The architecture should have four layers: upstream source (`easyPlaywright`), adaptation/build (sync + convert + patch), execution (scenarios + simulations + runner), and docs/output. This gives a clean story for reviewers and makes recurring syncs safe.

**Major components:**
1. Synced upstream pages — raw Playwright source of truth
2. Generated k6 pages plus patch layer — runtime-safe adaptation boundary
3. Scenario registry and simulations — reusable execution model
4. Runner/config/docs — local usability and showcase clarity

### Critical Pitfalls

1. **Treating k6 like Playwright at runtime** — enforce sync -> convert -> patch boundaries
2. **Overbuilding Grafana before smoke works** — keep first milestone tightly focused
3. **Copying all enterprise complexity from `ir-perf-k6`** — selectively adopt only what helps the showcase
4. **Editing generated files manually** — keep durable behavior in converter or patch modules
5. **Docs that explain commands but not architecture** — document the adaptation story explicitly

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation & Project Shape
**Rationale:** Build and config discipline must exist before adaptation starts.
**Delivers:** TypeScript/Vite-capable project shape, env/config path, runner surface
**Addresses:** Build and config requirements
**Avoids:** Enterprise overbuild

### Phase 2: Upstream Sync & k6 Adaptation
**Rationale:** The core technical proof is adapting `easyPlaywright` into k6-safe modules.
**Delivers:** Sync command, converter path, persistent patch strategy
**Uses:** Upstream source model and adaptation layer
**Implements:** Conversion architecture

### Phase 3: Smoke Scenarios & Supported Execution
**Rationale:** Once pages exist, runnable smoke scenarios become the main proof of value.
**Delivers:** Scenario registry, smoke flows, main smoke simulation
**Uses:** Generated k6 page layer
**Implements:** Execution layer

### Phase 4: Example Profiles & Report Surface
**Rationale:** Example load/capacity code should extend the same runner after smoke is solid.
**Delivers:** Example profiles and report-ready artifacts

### Phase 5: Showcase Docs & Polish
**Rationale:** Recruiter comprehension is a deliverable, not an afterthought.
**Delivers:** Clear README, quickstart, architecture explanation, final polish

### Phase Ordering Rationale

- Build and config come before conversion because the adaptation needs a stable execution target
- Conversion comes before scenarios because scenarios must consume k6-safe modules, not raw Playwright
- Smoke comes before example scaling because supported execution must exist before illustrative profiles
- Docs finish the milestone because they need the final architecture in place

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2:** Converter details and unsupported Playwright-to-k6 API gaps
- **Phase 4:** How much reporting to include without bloating the repo

Phases with standard patterns (skip research-phase):
- **Phase 1:** Standard build/config work
- **Phase 5:** Standard documentation and polish work

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Backed by current reference repos and official k6 docs |
| Features | HIGH | Directly aligned with user intent and reference repos |
| Architecture | HIGH | Clear adaptation path already visible in `ir-perf-k6` |
| Pitfalls | HIGH | Specific and repeatedly visible in this kind of repo adaptation |

**Overall confidence:** HIGH

### Gaps to Address

- Converter scope: exact unsupported Playwright patterns in `easyPlaywright` need validation during Phase 2
- Reporting scope: choose the smallest artifact set that still looks strong in a recruiter demo

## Sources

### Primary (HIGH confidence)
- `C:\Users\pzhly\Documents\GitHub\ir-perf-k6\README.md` — execution model and project shape
- `C:\Users\pzhly\Documents\GitHub\ir-perf-k6\docs\DEVELOPMENT.md` — architecture rationale
- `C:\Users\pzhly\Documents\GitHub\easyPlaywright\README.md` — upstream model
- https://grafana.com/docs/k6/latest/using-k6-browser/ — browser testing role
- https://grafana.com/docs/k6/latest/using-k6/javascript-typescript-compatibility-mode/ — TS limitations and bundling context

### Secondary (MEDIUM confidence)
- Current `easyk6` repository structure — existing validated baseline

---
*Research completed: 2026-04-23*
*Ready for roadmap: yes*
