# Roadmap: Recruiter-Ready EasyK6 Adaptation

## Overview

This milestone transforms `easyk6` from a small JavaScript demo into a recruiter-ready k6 browser framework that reuses `easyPlaywright` as its permanent Playwright POM source. The roadmap is intentionally smoke-first: prove the adaptation, make it runnable and understandable, then keep load/capacity as example depth without letting them dominate the repo.

The reference repo `ir-perf-k6` informs the structure, but not every feature deserves to survive into this showcase. Each phase strips the idea down to the clearest story a reviewer can understand: upstream sync, k6-safe adaptation, smoke execution, example scaling paths, and polished documentation.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation & Project Shape** - Establish the TypeScript/Vite-capable structure, config path, and runner surface that the adaptation will sit on
- [ ] **Phase 2: Upstream Sync & k6 Adaptation** - Bring in `easyPlaywright` as source material and create a safe sync -> convert -> patch pipeline
- [ ] **Phase 3: Smoke Scenarios & Supported Execution** - Build the supported smoke flow around a scenario registry and runnable browser journeys
- [ ] **Phase 4: Example Profiles & Output Surface** - Add example load/capacity code and a summary/report surface without changing smoke-first scope
- [ ] **Phase 5: Showcase Docs & Recruiter Polish** - Make the repo easy to understand, easy to run, and explicit about the architectural choices

## Phase Details

### Phase 1: Foundation & Project Shape
**Goal**: `easyk6` has a clean project shape, modern build path, and validated config surface ready for real adaptation work
**Depends on**: Nothing
**Requirements**: BUILD-01, BUILD-02
**Success Criteria** (what must be TRUE):
  1. The repo has a documented build command for the adapted structure
  2. Runtime configuration fails early with a clear message when required values are missing or invalid
  3. Project folders communicate upstream vs generated vs custom responsibilities clearly
  4. The runner surface is obvious enough that later smoke work plugs into it without reshaping the repo again
**Plans**: 2 plans

Plans:
- [ ] 01-01-PLAN.md -- Introduce build-friendly structure, aliases, and TypeScript/Vite foundation
- [ ] 01-02-PLAN.md -- Add config validation and first runner shell around the new structure

### Phase 2: Upstream Sync & k6 Adaptation
**Goal**: `easyPlaywright` content can be synchronized into `easyk6` and transformed into k6-safe modules without manual scenario hacks
**Depends on**: Phase 1
**Requirements**: UPST-01, UPST-02, UPST-03
**Success Criteria** (what must be TRUE):
  1. There is one documented sync path from `easyPlaywright` into the repo
  2. Converted k6-compatible page modules are generated from synced source material
  3. k6-specific custom behavior lives outside generated output and survives re-sync/re-convert cycles
  4. Scenario files depend on k6-safe modules, not raw upstream Playwright pages
**Plans**: 2 plans

Plans:
- [ ] 02-01-PLAN.md -- Add upstream sync workflow and source folder boundaries
- [ ] 02-02-PLAN.md -- Implement conversion output and preserved k6 patch layer

### Phase 3: Smoke Scenarios & Supported Execution
**Goal**: The repo can run believable smoke browser performance journeys using reused upstream page objects through a central registry
**Depends on**: Phase 2
**Requirements**: BUILD-03, SCEN-01, SCEN-02, SCEN-03, PROF-01
**Success Criteria** (what must be TRUE):
  1. A reviewer can launch the main smoke simulation with one documented command
  2. Smoke scenarios are selected from a central registry with readable IDs and descriptions
  3. Smoke flows exercise real browser journeys against the demo target using reused upstream page objects
  4. Smoke is the default supported profile and stays lightweight enough for demos
**Plans**: 2 plans
**UI hint**: no

Plans:
- [ ] 03-01-PLAN.md -- Build scenario registry and main smoke simulation entrypoint
- [ ] 03-02-PLAN.md -- Adapt initial smoke journeys against the demo target and validate profile defaults

### Phase 4: Example Profiles & Output Surface
**Goal**: Load and capacity examples live in the same architecture and smoke runs produce reviewer-friendly output
**Depends on**: Phase 3
**Requirements**: PROF-02, PROF-03, PROF-04
**Success Criteria** (what must be TRUE):
  1. Load profile code exists and reuses the same runner/config architecture
  2. Capacity profile code exists and reuses the same runner/config architecture
  3. Smoke execution emits a readable summary or artifact useful in a recruiter review
  4. Example profiles are clearly labeled as examples, not the main supported path
**Plans**: 1 plan

Plans:
- [ ] 04-01-PLAN.md -- Add example load/capacity profiles and a small report/summary surface

### Phase 5: Showcase Docs & Recruiter Polish
**Goal**: A recruiter or technical reviewer can understand the architecture, run smoke locally, and see why the repo demonstrates strong engineering judgment
**Depends on**: Phase 4
**Requirements**: DOCS-01, DOCS-02
**Success Criteria** (what must be TRUE):
  1. README or quickstart explains the upstream reuse story and the smoke demo path clearly
  2. Architecture docs explain what was adapted from `ir-perf-k6` and what was simplified on purpose
  3. The repo communicates smoke-first scope and deferred Grafana work without ambiguity
  4. The final repo feels polished rather than experimental
**Plans**: 1 plan

Plans:
- [ ] 05-01-PLAN.md -- Rewrite showcase docs, architecture narrative, and final polish pass

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Project Shape | 0/2 | Pending | - |
| 2. Upstream Sync & k6 Adaptation | 0/2 | Pending | - |
| 3. Smoke Scenarios & Supported Execution | 0/2 | Pending | - |
| 4. Example Profiles & Output Surface | 0/1 | Pending | - |
| 5. Showcase Docs & Recruiter Polish | 0/1 | Pending | - |
