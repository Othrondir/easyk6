# Architecture Research

**Domain:** Showcase k6 browser framework that reuses Playwright Page Objects
**Researched:** 2026-04-23
**Confidence:** HIGH

## Standard Architecture

### System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                    Upstream Source Layer                    │
├─────────────────────────────────────────────────────────────┤
│  easyPlaywright Page Objects + components + test data      │
└─────────────────────────────────────────────────────────────┘
                              │ sync
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 Adaptation / Build Layer                    │
├─────────────────────────────────────────────────────────────┤
│  src/pages (synced) -> converter -> lib/pages (generated)  │
│  + lib/pages-k6-patches (hand-written k6-safe extensions)  │
└─────────────────────────────────────────────────────────────┘
                              │ build
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Execution / Scenario Layer                 │
├─────────────────────────────────────────────────────────────┤
│  k6/scenarios -> scenario registry -> simulations/tests    │
│  config + runner CLI -> k6 browser execution               │
└─────────────────────────────────────────────────────────────┘
                              │ output
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Docs / Summary Layer                      │
├─────────────────────────────────────────────────────────────┤
│  README + quickstart + structured run summary artifacts     │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Upstream synced pages | Preserve Playwright source truth | Copied or synchronized TypeScript under `src/pages/` |
| Converter | Turn upstream code into k6-safe modules | Scripted transform with repeatable output |
| k6 patch layer | Hold custom behavior that conversion cannot infer | Hand-written TypeScript modules preserved across syncs |
| Scenario registry | Map public scenario IDs to reusable flows | Central typed registry plus metadata |
| Simulation entrypoints | Define options and call scenarios | Small k6 test files with profile-aware config |
| Runner/config layer | Provide friendly CLI and env validation | Node script plus `.env` loader and defaults |

## Recommended Project Structure

```text
easyk6/
├── src/
│   └── pages/                 # Synced Playwright upstream pages
├── lib/
│   ├── pages/                 # Generated k6-compatible pages
│   ├── pages-k6-patches/      # Hand-written k6-only overrides
│   └── utils/                 # Config, registry, helpers, profiles
├── k6/
│   ├── scenarios/             # Reusable browser flows
│   └── simulations/           # Executable test entry points
├── config/                    # Env files and conversion config
├── scripts/                   # Sync, convert, runner, report helpers
├── reports/                   # Generated artifacts
├── README.md
└── package.json
```

### Structure Rationale

- **`src/pages/`:** Keeps synced upstream material separate from generated and custom code
- **`lib/pages/` + `lib/pages-k6-patches/`:** Makes generated output disposable while preserving k6-specific logic
- **`k6/scenarios/` + `k6/simulations/`:** Separates reusable flows from runnable entrypoints, matching the strongest pattern in `ir-perf-k6`
- **`scripts/`:** Gives the repo a professional operational surface without mixing tooling into runtime modules

## Architectural Patterns

### Pattern 1: Upstream -> Generated -> Patched

**What:** Keep upstream Playwright code separate from generated k6 pages and separate again from hand-written patches.
**When to use:** Always, when one source system feeds another runtime.
**Trade-offs:** Slightly more folders, but much safer maintenance.

**Example:**
```typescript
// src/pages/HomePage.ts        -> synced upstream
// lib/pages/HomePage.ts        -> generated for k6
// lib/pages-k6-patches/home.ts -> hand-written k6-only fixes
```

### Pattern 2: Scenario Registry Over Direct Imports

**What:** Expose scenarios through IDs and metadata instead of ad hoc test file imports.
**When to use:** When you want profile-driven execution or CLI selection.
**Trade-offs:** Small registry maintenance overhead, much cleaner execution UX.

**Example:**
```typescript
export const SCENARIO_REGISTRY = {
  homepage: { fn: homepageSmoke, description: 'Open homepage and verify core content' },
  navigation: { fn: navigationSmoke, description: 'Navigate across top-level pages' },
};
```

### Pattern 3: Profile-Driven Simulation Entry Points

**What:** Keep profile logic in config/helpers so smoke, load, and capacity share one mental model.
**When to use:** When smoke is primary but example scaling paths also matter.
**Trade-offs:** Slightly more abstraction, much better extensibility.

**Example:**
```typescript
const profile = getProfile(__ENV.TEST_TYPE || 'smoke');
export const options = profile.options;
```

## Data Flow

### Request Flow

```text
easyPlaywright source
    ↓ sync
src/pages
    ↓ convert
lib/pages + patches
    ↓ import
k6 scenarios
    ↓ execute
k6 simulation / runner
    ↓ emit
console summary + reports
```

### State Management

```text
env files / CLI flags
    ↓
config validation
    ↓
profile + scenario selection
    ↓
simulation options
    ↓
runtime execution
```

### Key Data Flows

1. **Upstream adaptation flow:** `easyPlaywright` pages are synced, converted, then imported by k6 scenarios
2. **Execution flow:** runner reads env/profile/scenario settings, simulation builds k6 options, selected scenarios execute
3. **Showcase flow:** run output and docs explain how the architecture fits together for recruiters

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Showcase / local smoke | Keep one supported smoke path, minimal scenarios, readable docs |
| Small team reuse | Add more scenarios and stronger patch coverage |
| Larger perf platform | Introduce richer reporting, CI, distributed execution, and observability |

### Scaling Priorities

1. **First bottleneck:** conversion gaps between Playwright APIs and k6 browser support -> fix in converter or patch layer
2. **Second bottleneck:** execution complexity from too many profiles/scenarios -> keep smoke primary and examples clearly secondary

## Anti-Patterns

### Anti-Pattern 1: Editing Generated Pages by Hand

**What people do:** Patch files directly under generated output.
**Why it's wrong:** Re-sync or re-convert destroys the work.
**Do this instead:** Keep generated output disposable and preserve custom logic in a patch layer.

### Anti-Pattern 2: Putting Raw Locators in Scenarios

**What people do:** Bypass page objects to get tests running faster.
**Why it's wrong:** It breaks the main value proposition of upstream POM reuse.
**Do this instead:** Fix upstream objects, converter rules, or k6 patch modules.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| `easyPlaywright` repo | File sync / copy / scripted import | Permanent upstream model |
| k6 browser runtime | Local binary or pinned Docker browser image | Keep smoke workflow easy to run |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `src/pages` <-> converter | File-based transform | Must stay scripted and repeatable |
| `lib/pages` <-> `k6/scenarios` | Direct module imports | Scenarios should consume only k6-safe modules |
| runner <-> simulations | Env + CLI + function calls | Keep public execution contract stable |

## Sources

- `C:\Users\pzhly\Documents\GitHub\ir-perf-k6\docs\DEVELOPMENT.md`
- `C:\Users\pzhly\Documents\GitHub\ir-perf-k6\config\convert-to-k6.sh`
- `C:\Users\pzhly\Documents\GitHub\ir-perf-k6\scripts\k6-runner.js`
- `C:\Users\pzhly\Documents\GitHub\easyPlaywright\src\fixtures\pageFixtures.ts`
- Current `easyk6` repository structure

---
*Architecture research for: Showcase k6 browser framework that reuses Playwright Page Objects*
*Researched: 2026-04-23*
