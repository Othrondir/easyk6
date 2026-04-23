# Requirements: EasyK6

**Defined:** 2026-04-23
**Core Value:** Demonstrate that one Playwright POM source can power maintainable k6 browser smoke tests through a clean architecture that recruiters can read, trust, and run locally

## v1 Requirements

### Upstream Integration

- [ ] **UPST-01**: Maintainer can sync Playwright Page Objects from `easyPlaywright` into `easyk6` with a documented scripted command
- [ ] **UPST-02**: Synced upstream page objects can be converted into k6-compatible modules without manual locator rewrites inside scenario files
- [ ] **UPST-03**: k6-specific extensions survive repeated upstream sync/conversion cycles through a preserved patch mechanism

### Build And Config

- [x] **BUILD-01**: Developer can build k6 test assets from the adapted project structure with one documented command
- [ ] **BUILD-02**: Developer can configure base URL and other required runtime settings through env files or env vars that fail fast when invalid
- [ ] **BUILD-03**: Developer can launch the primary smoke simulation locally through one documented command

### Scenario System

- [ ] **SCEN-01**: Repo exposes a central registry of named scenarios instead of only one-off test files
- [ ] **SCEN-02**: Smoke scenarios run simple browser performance journeys against the `easyPlaywright` demo target using reused upstream page objects
- [ ] **SCEN-03**: Scenario selection is configurable through CLI or environment without code edits

### Profiles And Output

- [ ] **PROF-01**: Smoke is the default supported profile with deterministic low-resource settings suitable for demos
- [ ] **PROF-02**: Load profile code exists as an example within the same runner/config system
- [ ] **PROF-03**: Capacity profile code exists as an example within the same runner/config system
- [ ] **PROF-04**: Smoke execution produces a readable summary or report-ready artifact that helps a reviewer understand what ran

### Documentation

- [ ] **DOCS-01**: README or quickstart explains how Playwright upstream reuse works and how to run the smoke demo locally
- [ ] **DOCS-02**: Architecture docs explain which patterns were adapted from `ir-perf-k6` and which were intentionally simplified for recruiter readability

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
| UPST-01 | Phase 2 | Pending |
| UPST-02 | Phase 2 | Pending |
| UPST-03 | Phase 2 | Pending |
| BUILD-03 | Phase 3 | Pending |
| SCEN-01 | Phase 3 | Pending |
| SCEN-02 | Phase 3 | Pending |
| SCEN-03 | Phase 3 | Pending |
| PROF-01 | Phase 3 | Pending |
| PROF-02 | Phase 4 | Pending |
| PROF-03 | Phase 4 | Pending |
| PROF-04 | Phase 4 | Pending |
| DOCS-01 | Phase 5 | Pending |
| DOCS-02 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0

---
*Requirements defined: 2026-04-23*
*Last updated: 2026-04-23 after roadmap creation*
