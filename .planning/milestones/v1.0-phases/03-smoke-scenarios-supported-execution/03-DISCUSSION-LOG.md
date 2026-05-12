# Phase 3: Smoke Scenarios & Supported Execution - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-11
**Phase:** 03-smoke-scenarios-supported-execution
**Areas discussed:** Registry shape + scenario IDs, Smoke journey content, Simulation entrypoint + k6 wiring, Smoke profile semantics

---

## Gray Area Selection

User selected: **Registry shape + scenario IDs** (initial pick); then chose to also discuss the remaining 3 areas after the registry decisions landed.

| Option | Description | Selected |
|--------|-------------|----------|
| Registry shape + scenario IDs | Where scenarios register, how `--scenario <id>` resolves, default ID | ✓ (then expanded) |
| Smoke journey content | Which POMs drive the flow, how many scenarios, delays | ✓ (after expand) |
| Simulation entrypoint + k6 wiring | Single entry vs per-scenario, dispatch mechanism, source/dist path | ✓ (after expand) |
| Smoke profile semantics | VUs, iterations, thresholds, output minimum | ✓ (after expand) |

---

## Registry shape + scenario IDs

### Where do scenarios live and how does the registry expose them?

| Option | Description | Selected |
|--------|-------------|----------|
| Single TS map | `lib/scenarios/index.ts` exports `SCENARIO_REGISTRY: Record<id, { fn, description, pages }>` | ✓ |
| Folder + glob auto-discover | `lib/scenarios/*.ts` discovered via Vite glob; each module exports `meta` + `run` | |
| ir-perf areas + parser | `lib/scenarios/<area>/<scenario>.ts` + separate `scenario-config-parser.ts` | |

**User's choice:** Single TS map (Recommended).
**Decision:** D-51

### Scenario ID convention

| Option | Description | Selected |
|--------|-------------|----------|
| kebab-case slug | `home-smoke`, `blog-post-smoke`, `about-smoke` | ✓ |
| Page-name first, no profile suffix | `home`, `blog-post`, `about` | |
| Dotted namespace | `smoke.home`, `smoke.blog-post` | |

**User's choice:** kebab-case slug (Recommended).
**Decision:** D-52

### Default scenario when `npm run smoke` runs with no `--scenario`

| Option | Description | Selected |
|--------|-------------|----------|
| `home-smoke` exercising the demo patch | Lands on QAbbalah home, calls `measureNavigation()` from the Phase 2 patch | ✓ |
| `home` simplest page-load smoke | Navigate + waitForLoadState only | |
| Keep `smoke-shell` placeholder | Defer the real default to Plan 03-02 | |

**User's choice:** `home-smoke` exercising the demo patch (Recommended).
**Decision:** D-53

### Multi-scenario selection in v1

| Option | Description | Selected |
|--------|-------------|----------|
| Single scenario per run | `--scenario <id>` resolves to exactly one entry | ✓ |
| Comma-separated multi-select now | `--scenario home-smoke,blog-post-smoke` runs both | |

**User's choice:** Single scenario per run (Recommended).
**Decision:** D-54 (multi-scenario deferred — see Deferred Ideas)

### What does an unknown `--scenario <id>` do

| Option | Description | Selected |
|--------|-------------|----------|
| Fail fast with list of available IDs | Exit non-zero, print `Unknown scenario 'X'. Available: ...` | ✓ |
| Fall back to default scenario | Silently runs the default when ID isn't found | |

**User's choice:** Fail fast with list of available IDs (Recommended).
**Decision:** D-55

---

## Smoke journey content

### How many smoke scenarios ship in v1

| Option | Description | Selected |
|--------|-------------|----------|
| 2 scenarios | `home-smoke` + `blog-post-smoke` | ✓ |
| 1 scenario | Just `home-smoke` | |
| 3 scenarios | home + blog-post + about | |

**User's choice:** 2 scenarios (Recommended).
**Decision:** D-56

### Journey depth for each scenario

| Option | Description | Selected |
|--------|-------------|----------|
| Navigate + assert visible components | `waitForLoadState` + 2-3 visibility assertions via selectors shim | ✓ |
| Navigate only | `navigate()` + `waitForLoadState()`, no assertions | |
| Navigate + 1 user-style interaction | Click first link or scroll | |

**User's choice:** Navigate + assert visible components (Recommended).
**Decision:** D-57

### Delays / pacing inside a smoke iteration

| Option | Description | Selected |
|--------|-------------|----------|
| Single `sleep(1)` between steps | One-second pause after navigate and between assertions | ✓ |
| No delays — run as fast as possible | <2s iteration | |
| ir-perf `SCENARIO_MODE` toggle | Env var picks fast/realistic | |

**User's choice:** Single `sleep(1)` between steps (Recommended).
**Decision:** D-58

### Error behavior when a POM call throws mid-journey

| Option | Description | Selected |
|--------|-------------|----------|
| k6 default | Exception propagates, k6 marks iteration failed | ✓ |
| Try/catch + screenshot via k6 browser API | Wrap each step, screenshot on throw, rethrow | |

**User's choice:** k6 default (Recommended).
**Decision:** D-59

---

## Simulation entrypoint + k6 wiring

### Where does the simulation entrypoint live and how many are there

| Option | Description | Selected |
|--------|-------------|----------|
| Single `lib/simulations/smoke.ts` registry-dispatch | One entry reads `__ENV.SCENARIO`, looks up registry | ✓ |
| Per-scenario entry file | Each scenario is its own k6 entry | |
| Per-profile entry | `smoke.ts` + later `load.ts`/`capacity.ts` (same shape as chosen, named for clarity) | |

**User's choice:** Single `lib/simulations/smoke.ts` registry-dispatch (Recommended).
**Decision:** D-60

### How does `perf-runner` pass the scenario ID to k6

| Option | Description | Selected |
|--------|-------------|----------|
| k6 env var `-e SCENARIO=<id>` | `k6 run -e SCENARIO=home-smoke dist/simulations/smoke.js` | ✓ |
| Build-time injection (Vite define) | Rebuild bundle per scenario | |
| Separate built artifact per scenario | Vite produces one bundle per scenario | |

**User's choice:** k6 env var (Recommended).
**Decision:** D-61

### Source path for simulation entry + dist mapping

| Option | Description | Selected |
|--------|-------------|----------|
| `lib/simulations/smoke.ts` → `dist/simulations/smoke.js` | Update `resolveEntryFile` to point at `dist/simulations/<profile>.js` | ✓ |
| Keep `tests/<scenario>.test.ts` | Leave existing placeholder mapping | |
| `k6/simulations/smoke.ts` ir-perf-style | Top-level `k6/` directory | |

**User's choice:** `lib/simulations/smoke.ts` → `dist/simulations/smoke.js` (Recommended).
**Decision:** D-62

### k6 options / browser config — where defined

| Option | Description | Selected |
|--------|-------------|----------|
| `export const options` in simulation entry | Smoke profile constants live in `lib/simulations/smoke.ts` | ✓ |
| External options module imported by entry | `lib/config/k6-options.ts` returns options per profile | |
| `perf-runner` passes via CLI flags | `--vus 1 --iterations 1` set by perf-runner | |

**User's choice:** `export const options` in simulation entry (Recommended).
**Decision:** D-63

---

## Smoke profile semantics

### VU + iteration count for the smoke profile

| Option | Description | Selected |
|--------|-------------|----------|
| 1 VU, 1 iteration | One full journey end-to-end | ✓ |
| 1 VU, 3 iterations | Smoother averages, 3x runtime | |
| Multi-VU constant-vus 30s | Conflates smoke with load | |

**User's choice:** 1 VU, 1 iteration (Recommended).
**Decision:** D-64

### k6 browser scenario executor type

| Option | Description | Selected |
|--------|-------------|----------|
| `shared-iterations` | Single VU consumes fixed iteration count | ✓ |
| `per-vu-iterations` | Each VU runs own N iterations | |
| `constant-vus` with duration | Time-bounded, sustained load | |

**User's choice:** `shared-iterations` (Recommended).
**Decision:** D-65

### Thresholds on the smoke profile

| Option | Description | Selected |
|--------|-------------|----------|
| Light defaults | LCP p95<3s, http_req_failed<1%, iteration<15s | ✓ |
| No thresholds | Pass-by-completion only | |
| Strict thresholds | LCP<2.5s, TTFB<800ms (Web Vitals 'good') | |

**User's choice:** Light defaults (Recommended).
**Decision:** D-66

### Output minimum in Phase 3 (rich output is Phase 4's PROF-02/03/04 scope)

| Option | Description | Selected |
|--------|-------------|----------|
| k6 default console summary only | No `handleSummary`, no artifact | ✓ |
| k6 default + tiny `summary.json` artifact | One-line JSON per run | |
| Recruiter-readable text summary line | Custom single-line print at end | |

**User's choice:** k6 default console summary only (Recommended).
**Decision:** D-67

---

## Claude's Discretion

The user explicitly delegated these to Claude / the planner:

- Exact internal function and type names inside `lib/simulations/smoke.ts` (the dispatch helper, the `Scenario` type signature)
- The exact 2-3 component visibility assertions inside each scenario (which selectors from `lib/pages/components/*`)
- Wording of the "Unknown scenario" error and the available-IDs listing format
- Whether thresholds live inline in the simulation file or pulled from a shared helper
- Internal helper organization inside `lib/scenarios/` (shared `types.ts` vs inline)
- Test coverage shape for the registry + simulation; minimum is registry-lookup + unknown-ID failure path

## Deferred Ideas

- Multi-scenario selection (comma-separated `--scenario a,b`) — Phase 4 reconsider
- `SCENARIO_MODE` env toggle (fast/realistic) — Phase 4 if needed
- Custom recruiter-readable summary line — Phase 4 PROF-04
- Screenshot-on-error wrapping — Phase 4 artifact territory
- A third `about-smoke` scenario — 30-line follow-up if showcase needs more breadth
- Scenario validation / "smoke the registry" test — planner's call within Phase 3 scope
