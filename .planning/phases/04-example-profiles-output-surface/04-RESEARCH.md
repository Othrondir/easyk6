# Phase 4: Example Profiles & Output Surface - Research

**Researched:** 2026-05-11
**Domain:** k6 1.5 browser-module simulation entries (`ramping-vus` + `ramping-arrival-rate`) and `handleSummary`-based artifact emission, factored through a shared TS helper that runs inside the goja JavaScript runtime.
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Load profile shape (PROF-02)**

- **D-01** Load profile executor is `ramping-vus` with classic 3-stage shape — `[ {duration:'30s', target:5}, {duration:'60s', target:5}, {duration:'30s', target:0} ]`. ~2 minutes total, peak 5 concurrent VUs.
- **D-02** Load profile reuses the existing scenario registry via `__ENV.SCENARIO`. Default scenario for the load profile is `home-smoke`. Invocation pattern: `npm run example:load -- --demo` (default home-smoke) or `npm run example:load -- --scenario blog-post-smoke --demo`. No load-specific scenarios authored.
- **D-03** Load profile thresholds (SOFT, no `abortOnFail`):
  - `browser_web_vital_lcp: ['p(95)<4000']`
  - `http_req_failed: ['rate<0.05']`
  - `iteration_duration: ['p(95)<25000']`
  - `http_req_duration: ['p(95)<2000']` (NEW for load)
- **D-04** Load profile thresholds remain SOFT. A trip is captured in the summary; the run completes the full ramp.

**Capacity profile shape (PROF-03)**

- **D-05** Capacity semantics are find-the-breaking-point, not sustain-the-target.
- **D-06** Capacity executor is `ramping-arrival-rate` (iterations-per-second ramp).
- **D-07** Capacity ramp parameters: `startRate: 0`, `timeUnit: '1s'`, `stages: [ { duration: '180s', target: 10 } ]`, `preAllocatedVUs: 10`, `maxVUs: 10`. ~3 GB peak chromium RAM on a 16 GB laptop.
- **D-08** Capacity thresholds (SOFT):
  - `browser_web_vital_lcp: ['p(95)<4000']`
  - `http_req_failed: ['rate<0.05']`
  - `http_req_duration: ['p(95)<3000']` (looser than load's 2000)
  - `iteration_duration: ['p(95)<30000']` (looser than load's 25000)

**Output surface (PROF-04)**

- **D-09** Output emits TWO artifacts per run: `reports/<profile>-<scenario>.md` (recruiter-readable Markdown) AND `reports/<profile>-<scenario>.json` (full k6 dump).
- **D-10** Output is emitted on EVERY k6 run — smoke, load, and capacity all produce the artifact pair. No `--report` opt-in flag. `reports/` is already gitignored.
- **D-11** Markdown content structure (curated narrative):
  - Header — profile, scenario, baseUrl, ISO run date
  - "What ran" — scenario description + profile shape
  - Thresholds table — name | bound | actual | PASS/FAIL
  - Key metrics table — LCP p(95), iteration_duration p(95), http_req_failed rate, http_req_duration p(95) where present, browser_data_received total
  - Footer — link to the `.json` sibling
- **D-12** File naming overwrites on every run: `reports/<profile>-<scenario>.md` and `reports/<profile>-<scenario>.json`. No timestamping.

**Example labeling strategy**

- **D-13** package.json: `npm run smoke` stays as-is (supported); `npm run example:load` and `npm run example:capacity` are the example invocations (NEW). Bare `npm run perf -- --profile load|capacity` still works. README quickstart includes a 3-row table marking smoke as "Supported" and load/capacity as "Example".
- **D-14** Short JSDoc banner at the top of `lib/simulations/load.ts` AND `lib/simulations/capacity.ts` (smoke.ts stays unbannered).
- **D-15** README "Supported vs Example" table lives in the **Quickstart section, prominent** — directly after the project intro, before install/build steps.

**Shared infrastructure**

- **D-16** Shared output helper lives at `lib/simulations/lib/summary.ts` and exports a factory `makeHandleSummary(profileMetadata)` returning a `handleSummary(data)` function. Markdown formatter, JSON writer, and threshold-table render live in one place.

**Plan structure**

- **D-17** Phase 4 is one ROADMAP plan (04-01). MUST land all of (a) `lib/simulations/lib/summary.ts` shared helper, (b) `lib/simulations/load.ts`, (c) `lib/simulations/capacity.ts`, (d) package.json `example:load` + `example:capacity` scripts, (e) README quickstart-table contract, (f) `dist/simulations/load.js` + `dist/simulations/capacity.js` validated via `npm run validate:build` updates. Smoke MUST be re-validated through the new shared summary path.

**Plan 03-02 carry-forward folded into Phase 4 scope**

- **D-18** `PHASE_ONE_SMOKE_ENTRY_FILE` constant in `lib/config/runtime-config.ts` is removed in Phase 4. If `tests/unit/runtime-config.test.mjs` references the name, drop the import.
- **D-19** Plan 03-02 k6 1.5 runtime caveats are already encoded in code (commit `7d629ba`). The shared `makeHandleSummary` helper MUST NOT use `new URL(...)` since it runs inside k6 goja. Path manipulation uses string-level operations only.

### Claude's Discretion

- Exact internal naming of the factory return signature in `lib/simulations/lib/summary.ts` (`(data) => Record<string, string>` is the k6 contract; helper-internal types are Claude's call).
- Whether the markdown formatter and JSON writer live in the same module or split into `lib/simulations/lib/format-md.ts` + `lib/simulations/lib/format-json.ts`.
- The exact Markdown table column order (D-11 lists the columns; ordering inside the table is Claude's call).
- Whether `load.ts` / `capacity.ts` instantiate `K6PlaywrightSelectors` inline (mirroring smoke.ts) or factor the page-setup boilerplate into `lib/simulations/lib/page-setup.ts`.
- Specific test coverage shape — at minimum Node unit tests for the markdown + JSON formatters and a vite-build assertion that the two new entries emit.
- Whether to add `clean:reports` npm script (out-of-scope for any acceptance criterion).
- Whether `reports/` gets a `.gitkeep` placeholder.

### Deferred Ideas (OUT OF SCOPE)

- **Load-mixed scenario** — randomized home/post page selection per iteration.
- **k6 jslib HTML reporter** — pulls in jslib dependency, pushes toward "enterprise" framing.
- **Per-run timestamped reports** — full history under `reports/<timestamp>/`.
- **Two-phase capacity (ramp + sustain near ceiling)**.
- **`--report` opt-in flag**.
- **`clean:reports` npm script** (planner may include if trivial).
- **Grafana / OTEL export** — explicitly Out of Scope in PROJECT.md.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description (from REQUIREMENTS.md) | Research Support |
|----|------------------------------------|------------------|
| PROF-02 | Load profile code exists as an example within the same runner/config system | §2 Standard Stack (ramping-vus contract), §3 Architecture (load.ts entry shape), §6 Code Examples (verbatim `options` literal) |
| PROF-03 | Capacity profile code exists as an example within the same runner/config system | §2 (ramping-arrival-rate contract + preAllocatedVUs/maxVUs semantics), §3 (capacity.ts entry shape), §6 (verbatim `options` literal), §4 Don't Hand-Roll (use registry dispatch unchanged) |
| PROF-04 | Smoke execution produces a readable summary or report-ready artifact that helps a reviewer understand what ran | §2 (k6 `handleSummary` contract + Record<string,string> return), §3 (`lib/simulations/lib/summary.ts` factory architecture), §5 Pitfalls (goja restrictions, browser-vs-http metric divergence), §6 (verbatim markdown + JSON formatter pseudo-code), §9 Validation Architecture (falsifiable evidence per requirement) |
</phase_requirements>

## Summary

Phase 4 lands two new k6 simulation entries (`lib/simulations/load.ts`, `lib/simulations/capacity.ts`) and one shared output helper (`lib/simulations/lib/summary.ts`), all consuming the Phase 3 scenario registry through the SAME `__ENV.SCENARIO` dispatch path smoke uses. The architectural work is therefore additive — runner, config, registry, and Vite glob are already correct for what Phase 4 ships. The genuine research question is the `handleSummary` contract and how to write artifacts reliably from inside k6 goja.

The k6 `handleSummary(data) => Record<string, string>` contract is the **only** sanctioned path for writing files from inside k6. k6 invokes it once at end-of-test, takes the returned object, and writes each key as a file path with the corresponding string as content. Cross-platform path resolution is relative to the k6 process cwd (`scripts/perf-runner.mjs` spawns with `cwd: projectRoot`, so `reports/<profile>-<scenario>.md` resolves to the repo root on Win/Mac/Linux). `handleSummary` runs inside the same goja runtime as the simulation default function — meaning the D-19 caveats (no `new URL`, no `process`, no Buffer, no Node fs) apply VERBATIM to the shared helper. This is the most important constraint Phase 4 must honor.

`ramping-vus` and `ramping-arrival-rate` are both standard k6 executors with well-documented config surfaces. Both work with `options.browser.type: 'chromium'`. Browser scenarios populate `browser_*` metrics (LCP, FCP, browser_http_req_duration, browser_http_req_failed, browser_data_received) — the standard `http_req_*` metrics are reported but read 0/empty for pure browser scenarios (verified empirically in Phase 03-02 SUMMARY Run 1: `http_req_failed.............: 0.00%  0 out of 0`). This is a **landmine** for D-03/D-08 thresholds: `http_req_duration: ['p(95)<2000']` will trivially pass because no http_req_duration samples exist in browser scenarios. RESEARCH §5 Pitfall 1 documents this in depth; the recommended planner action is to **verify empirically in Wave 0 whether D-03/D-08 `http_req_duration` thresholds need to be retargeted at `browser_http_req_duration`** before locking the load.ts / capacity.ts threshold strings.

The factoring recommendation is: keep the markdown formatter and JSON writer as **pure functions** that take a `(data, metadata)` payload and return strings. The factory `makeHandleSummary` is a thin wrapper that composes them and returns the k6 `handleSummary` function with the `Record<string, string>` shape. This carve-out means the formatters become **Node-unit-testable** (deterministic data in → expected strings out) without needing goja stubs.

**Primary recommendation:** Land Phase 4 in three waves — (W0) Wave-0 RED tests for the markdown formatter + JSON formatter + vite-emit assertion + `PHASE_ONE_SMOKE_ENTRY_FILE` removal, (W1) author `lib/simulations/lib/summary.ts` pure helpers + factory and wire smoke.ts through it (smoke regression gate), (W2) author `load.ts` + `capacity.ts` + package.json scripts + validate-build update + README quickstart table. Capacity threshold trip is the recruiter narrative — calibrate empirically against QAbbalah and adjust D-07 stage parameters if 10 iter/s holds clean.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Load profile k6 options (executor + stages + thresholds) | k6 simulation entry (`lib/simulations/load.ts`) | — | k6 contract: `export const options` lives in the entry file the k6 binary executes; profile-keyed dist mapping (Phase 3 D-62) one-entry-per-profile |
| Capacity profile k6 options | k6 simulation entry (`lib/simulations/capacity.ts`) | — | Same as load — profile-keyed entry contract |
| Scenario dispatch from `__ENV.SCENARIO` | k6 simulation entry default function | Shared dispatch helper if extracted | Already proven in Phase 3 smoke.ts; load + capacity copy the same idiom |
| Page setup (browser.newPage + selectors + goto baseUrl) | k6 simulation entry default function | Shared `lib/simulations/lib/page-setup.ts` (Claude's discretion) | Q3 landmine fix (Phase 3 D-A7) MUST be replicated; shared helper de-duplicates the 6-line boilerplate across three entries |
| `handleSummary` artifact emission | k6 simulation entry (one-line `export const handleSummary = makeHandleSummary({profile, ...})`) | Shared factory `lib/simulations/lib/summary.ts` (k6-runtime side, goja-safe) | Factory pattern keeps each entry minimal and ensures formatter drift is structurally impossible |
| Markdown formatter (data + metadata → string) | Pure function (Node-testable, goja-safe) | — | Pure-function carve-out enables Node unit tests without goja stubs |
| JSON formatter (data → string) | Pure function (Node-testable, goja-safe) | — | Same carve-out — `JSON.stringify(data, null, 2)` is goja-safe but separating the entry point gives the planner a unit-testable seam |
| File write (path-keyed return) | k6 runtime (k6 binary writes Record<string,string> after handleSummary returns) | — | NOT user code — k6 owns the actual file write; user code only returns the dict. Cross-platform safe per k6 documentation |
| Build output emission (load.js, capacity.js) | Vite glob in `vite.config.ts` (already configured) | — | Existing glob `./lib/simulations/**/*.ts` auto-picks new entries (Phase 3 D-62 promise) |
| Build artifact validation | `scripts/validate-build.mjs::requiredFiles` | — | Strict list per CONTEXT recommendation — every npm entry must produce a build output |
| Recruiter-facing "Supported vs Example" framing | package.json scripts (primary signal) + JSDoc banner in load.ts/capacity.ts (secondary) + README quickstart table (tertiary) | — | Three orthogonal signals reinforce the smoke-first scope; D-13/D-14/D-15 |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| k6 with browser module | 1.5.0 (pinned, currently installed per package.json `toolVersions`) | Browser-level performance execution + executors + thresholds + `handleSummary` | [VERIFIED: package.json + Phase 03-02 SUMMARY real runs] Already running; Phase 4 adds NO new k6 surface beyond `ramping-vus`, `ramping-arrival-rate`, and `handleSummary` — all k6-native APIs |
| `k6/execution` module | bundled with k6 | `exec.test.abort` already wired Phase 3; `exec.scenario.name` available inside default fn for any future capacity-narrative hook | [CITED: grafana.com/docs/k6/latest/javascript-api/k6-execution/] Documented stdlib module; no install |
| TypeScript | 5.9.3 (pinned) | Typed simulation entries + helper | [VERIFIED: package.json] Existing toolchain |
| Vite | 5.4.21 (pinned) | Bundle `lib/simulations/*.ts` → `dist/simulations/*.js` | [VERIFIED: package.json + vite.config.ts] Glob already picks up new entries — NO config change required for D-17 (a)(b)(c) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Node `node:test` runner | bundled with Node 22 | Unit tests for markdown + JSON formatters | Use because formatters are pure functions; existing Phase 1-3 tests use this exact runner |
| `typescript` `transpileModule` + data-URL stitching | bundled with `typescript@5.9.3` | Test-time loading of TS files (existing pattern from `tests/unit/scenarios-registry.test.mjs`) | Reuse the multi-source data-URL pattern when a formatter test needs to import from `lib/simulations/lib/summary.ts` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `handleSummary` returning `Record<string, string>` | k6 jslib `htmlReport` from `https://jslib.k6.io/k6-summary/` | Adds remote-import dependency; produces a 200KB HTML file recruiter has to open separately; pulls in "enterprise" framing CLAUDE.md "Reference architecture" constraint explicitly rejects. Phase 4 CONTEXT defers this (D-09 chose markdown + JSON). |
| `handleSummary` returning `Record<string, string>` | k6 `--summary-export=path.json` CLI flag | k6-builtin but only emits ONE artifact (the JSON), not the recruiter-readable markdown D-11 specifies. Loses the curated narrative. |
| Markdown formatter as pure function in `lib/simulations/lib/summary.ts` | Inline formatting inside each simulation file | Three copies = three drift surfaces. D-16 forbids it. |
| `JSON.stringify(data, null, 2)` | Custom JSON formatter | `JSON.stringify` is goja-safe and built-in; no library needed. The `.json` sibling is the raw-data path per D-09 — minimal transformation is correct. |
| Pure-function formatter that takes `data` only | Curry-on-profile pattern (`format(profile)(scenario)(data)`) | Over-engineered for 3 call sites; `makeHandleSummary(metadata)` factory captures profile/scenario once and returns the closed `handleSummary(data)` — cleaner. |

**Installation:**

No new dependencies required. Phase 4 is purely an additive code change against the existing toolchain.

```bash
# Verify pinned versions are still current (informational — no install needed):
npm view k6 version
npm view typescript version
npm view vite version
```

**Version verification:** Tooling pins are stable across the Phase 3 closure. No `npm install` is required. The k6 binary version is asserted via `k6 version` at runner time (currently `v1.5.0` per Phase 03-02 SUMMARY); the goja-fork (sobek) lineage is internal to k6 and not a user-installable thing.

## Architecture Patterns

### System Architecture Diagram

```
                npm run example:load -- --demo (or --scenario X --demo)
                npm run example:capacity -- --demo (or --scenario X --demo)
                npm run smoke (unchanged)
                                       |
                                       v
                       +---------------+----------------+
                       |  scripts/perf-runner.mjs       |
                       |  (Node, resolves profile +     |
                       |   scenario + baseUrl via       |
                       |   runtime-config; emits        |
                       |   `-e SCENARIO=` + 4 others)   |
                       +---------------+----------------+
                                       |
                                       v
                       k6 spawn:  k6 run -e SCENARIO=<id> \
                                        -e BASE_URL=<url> \
                                        -e K6_PROFILE=<p> \
                                        -e K6_SCENARIO=<id> \
                                        -e K6_DEMO=<bool> \
                                        dist/simulations/<profile>.js
                                       |
                                       v
                       +------+--------+--------+--------+
                       |             dist/simulations/  |
                       |  smoke.js     load.js     capacity.js
                       |  (Phase 3)    (Phase 4)   (Phase 4)
                       +------+--------+--------+--------+
                              |        |         |
                              |        |         |
                              | All three SHARE the same dispatch shape:
                              | 1. resolveRuntimeConfig(__ENV.*)
                              | 2. lookup SCENARIO_REGISTRY[__ENV.SCENARIO]
                              | 3. browser.newPage() + page.goto(baseUrl) [Q3 fix]
                              | 4. await entry.fn({ page, selectors })
                              | 5. page.close()
                              |        |         |
                              v        v         v
                          +----------------------------+
                          |  lib/scenarios/index.ts    |
                          |  SCENARIO_REGISTRY         |
                          |  (home-smoke, blog-...)    |
                          |  UNCHANGED                 |
                          +----------------------------+
                              |        |         |
              k6 end-of-test  v        v         v
                          +----------------------------+
                          |   makeHandleSummary({       |
                          |     profile,                |
                          |     scenarioGetter,         |
                          |     baseUrlGetter, ...      |
                          |   })                        |
                          |   (lib/simulations/lib/     |
                          |    summary.ts)              |
                          +-------------+--------------+
                                        |
                                        v
                          handleSummary(data) returns:
                          {
                            'reports/<profile>-<scenario>.md':  formatMarkdown(data, meta),
                            'reports/<profile>-<scenario>.json': formatJson(data),
                            'stdout': <preserve k6 default summary>  // optional
                          }
                                        |
                                        v
                          k6 writes files (relative to cwd = projectRoot)
                                        |
                                        v
                          reports/smoke-home-smoke.md
                          reports/smoke-home-smoke.json
                          reports/load-home-smoke.md
                          reports/load-home-smoke.json
                          reports/capacity-home-smoke.md
                          reports/capacity-home-smoke.json
                          (gitignored; last run wins per D-12)
```

### Recommended Project Structure (incremental over Phase 3)

```
lib/
├── simulations/
│   ├── smoke.ts                 # Phase 3 — MODIFIED in Phase 4 to wire handleSummary through the new factory
│   ├── load.ts                  # NEW — ramping-vus + load thresholds (D-03) + makeHandleSummary({profile: 'load'})
│   ├── capacity.ts              # NEW — ramping-arrival-rate + capacity thresholds (D-08) + makeHandleSummary({profile: 'capacity'})
│   └── lib/                     # NEW subdirectory — shared simulation-runtime helpers (goja-safe)
│       ├── summary.ts           # NEW — exports makeHandleSummary(metadata) factory
│       ├── format-md.ts         # NEW (recommended) — pure markdown formatter; Node-unit-testable
│       └── format-json.ts       # NEW (recommended) — pure JSON formatter; Node-unit-testable
│       (Optionally: page-setup.ts to de-duplicate the goto+selectors boilerplate across three entries — Claude's discretion D-17)

reports/                         # already gitignored; .gitkeep optional per CONTEXT discretion
└── (artifacts emitted at runtime)

tests/
└── unit/
    ├── summary-format-md.test.mjs    # NEW — pure-function markdown formatter tests
    ├── summary-format-json.test.mjs  # NEW — pure-function JSON formatter tests
    └── simulations-emit.test.mjs     # NEW (recommended) — vite-build assertion that dist/simulations/load.js + capacity.js emit
```

### Pattern 1: Profile-keyed dist mapping (REUSED unchanged from Phase 3)

**What:** Each k6 profile maps to exactly one file under `lib/simulations/<profile>.ts`, which compiles to `dist/simulations/<profile>.js`. The runner's `resolveEntryFile(profile)` returns `dist/simulations/${profile}.js` (already in `runtime-config.ts:73-75`).

**When to use:** Whenever a new profile is added. Phase 4 adds two profiles — load and capacity — and the resolver picks them up with zero changes. This is the Phase 3 D-62 promise being collected.

**Example:**
```typescript
// runtime-config.ts:73 (UNCHANGED in Phase 4)
function resolveEntryFile(profile: string): string {
  return `dist/simulations/${profile}.js`;
}

// vite.config.ts (UNCHANGED in Phase 4)
const simulationFiles = globSync('./lib/simulations/**/*.ts');
// Picks up smoke.ts + load.ts + capacity.ts automatically.
```

### Pattern 2: `handleSummary` factory with metadata closure (NEW)

**What:** `makeHandleSummary(metadata)` returns a `(data) => Record<string,string>` function. The metadata (profile name + scenarioGetter + baseUrlGetter) is captured in the closure; the data is the k6-supplied end-of-test summary object.

**When to use:** In every simulation entry — smoke, load, capacity. Each entry does `export const handleSummary = makeHandleSummary({ profile: 'X' })`. The factory composes the pure markdown + JSON formatters internally.

**Example (recommended shape — Claude's discretion on exact internals):**
```typescript
// Source: lib/simulations/lib/summary.ts (NEW in Phase 4)
// Goja-safe: no new URL, no Node fs, no Buffer, no process.
// Pure JS string ops only. JSON.stringify is goja-safe.

import { formatMarkdown } from './format-md';
import { formatJson } from './format-json';

export interface ProfileMetadata {
  profile: string;           // 'smoke' | 'load' | 'capacity'
  scenarioGetter: () => string;  // closes over __ENV.SCENARIO at handleSummary time
  baseUrlGetter: () => string;   // closes over __ENV.BASE_URL
}

export function makeHandleSummary(metadata: ProfileMetadata) {
  return function handleSummary(data: K6SummaryData): Record<string, string> {
    const scenario = metadata.scenarioGetter() || 'home-smoke';
    const baseName = `reports/${metadata.profile}-${scenario}`;
    return {
      [`${baseName}.md`]: formatMarkdown(data, {
        profile: metadata.profile,
        scenario,
        baseUrl: metadata.baseUrlGetter(),
        runDateIso: new Date().toISOString(),  // Date IS available in goja
      }),
      [`${baseName}.json`]: formatJson(data),
    };
  };
}
```

```typescript
// Source: lib/simulations/load.ts (NEW in Phase 4) — recruiter narrative + the EXAMPLE JSDoc banner D-14
/**
 * EXAMPLE PROFILE — load testing shape.
 * Smoke is the supported demo path; this profile is illustrative of how
 * the same architecture (registry, runner, summary) scales beyond smoke.
 * See README §Profiles.
 */
import { browser } from 'k6/browser';
import exec from 'k6/execution';
import { resolveRuntimeConfig } from '@config';
import { K6PlaywrightSelectors } from '@pages/base/selectors';
import { SCENARIO_REGISTRY } from '@lib/scenarios';
import { makeHandleSummary } from './lib/summary';

declare const __ENV: Record<string, string | undefined>;

export const options = {
  scenarios: {
    browser: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 5 },
        { duration: '60s', target: 5 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '30s',
      options: { browser: { type: 'chromium' } },
    },
  },
  thresholds: {
    browser_web_vital_lcp: ['p(95)<4000'],
    http_req_failed: ['rate<0.05'],
    iteration_duration: ['p(95)<25000'],
    http_req_duration: ['p(95)<2000'],
  },
};

export default async function loadSimulation(): Promise<void> {
  // ... same dispatch shape as smoke.ts (see Pattern 3) ...
}

export const handleSummary = makeHandleSummary({
  profile: 'load',
  scenarioGetter: () => __ENV.SCENARIO ?? 'home-smoke',
  baseUrlGetter: () => __ENV.BASE_URL ?? '',
});
```

### Pattern 3: Simulation entry default function (REUSED from Phase 3)

**What:** Every `lib/simulations/<profile>.ts` shares the same default-function shape. Resolve runtime config, look up the scenario, fail-fast on miss via `exec.test.abort`, construct browser page, navigate to baseUrl (Q3 landmine fix), dispatch.

**When to use:** Three times — smoke (existing), load (new), capacity (new). A shared helper at `lib/simulations/lib/page-setup.ts` is Claude's discretion per D-17.

**Example:** see `lib/simulations/smoke.ts:57-100` — the dispatch body is copy-paste-with-handleSummary-added for load + capacity.

### Anti-Patterns to Avoid

- **Hand-rolling Node `fs.writeFileSync` inside `handleSummary`** — `fs` is not available in goja. The ONLY documented file-emission path is the returned `Record<string,string>`.
- **Calling `new URL(...)` inside the markdown/JSON formatters or summary helper** — same goja constraint as Phase 03-02 D-01 deviation. Use regex string-ops only.
- **Hard-coding `'reports/'` paths with `\` separators** — k6 accepts forward-slash POSIX-style paths and writes them correctly on Windows. Mixing `\\` is a portability landmine.
- **Threshold strings targeting `http_req_duration` for browser-only scenarios** — see §5 Pitfall 1. The metric is present in `data.metrics` but reads near-zero because browser scenarios route through chromium, not `k6/http`. The threshold passes trivially regardless of behavior. **Planner must empirically verify against the D-03 / D-08 threshold list.**
- **Returning non-string values from `handleSummary`** — the contract is `Record<string, string | ArrayBuffer>`; numbers / objects must be `JSON.stringify`'d before insertion.
- **Reading `__ENV` at module-import time** — `__ENV` is populated when k6 enters the script; reading it at module top-level can give undefined. Always read inside the default fn or the handleSummary closure (the factory pattern does this correctly via the getter functions).
- **Using `process.cwd()` or `process.env` inside summary helper** — `process` is not a goja global. The runner's `cwd` is set in `perf-runner.mjs:113` (`cwd: projectRoot`), so `reports/x.md` resolves correctly against the repo root from k6's perspective.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Writing artifact files from inside a k6 test | Some `k6/experimental/fs` hack or shelling out from k6 | `handleSummary(data) => Record<string, string>` return value | The k6 binary writes the files for you, atomically, cross-platform. Documented contract. |
| Dispatching scenarios from each simulation entry | A separate dispatch helper per profile | Reuse the existing `SCENARIO_REGISTRY` + `__ENV.SCENARIO` pattern from `smoke.ts` | Already proven Phase 3 — copy the dispatch shape across load.ts + capacity.ts |
| Generating ISO timestamps for the markdown header | Custom date string formatter | `new Date().toISOString()` | Goja-safe; built-in JavaScript; deterministic format |
| Path joining for `reports/<profile>-<scenario>.md` | Some `path.join` shim | String concatenation (`` `reports/${profile}-${scenario}.md` ``) | k6 accepts forward-slash POSIX paths cross-platform; goja has no `path` module |
| Discovering which thresholds passed/failed | Walking metrics by hand | `data.metrics[name].thresholds[string].ok` (boolean per threshold) | k6 attaches `thresholds: { 'p(95)<3000': { ok: true } }` directly to each metric in `data.metrics`. Iterate `data.metrics` once, collect every threshold entry. |
| Pretty-printing the JSON dump | Custom serializer | `JSON.stringify(data, null, 2)` | Goja-safe; standard JS |
| Build-output validation across multiple profiles | Walking `dist/` directory | Static list in `scripts/validate-build.mjs::requiredFiles` (extended per CONTEXT recommendation) | Phase 3 chose explicit-list; CONTEXT recommends strict — every npm entry must produce a build output |
| Loading `lib/simulations/<profile>.ts` in unit tests | Direct `import` from Node (will fail because of `k6/browser` resolution) | The existing multi-source data-URL stitching pattern from `tests/unit/scenarios-registry.test.mjs:23-58` | Already proven; reuse the stub list and extend with stubs for `./lib/summary` if a test needs to assert smoke/load/capacity options through the loader |

**Key insight:** Phase 4 is dominated by ONE k6 stdlib feature (`handleSummary`) and ONE goja constraint. Custom solutions for either are worse than the documented surface.

## Runtime State Inventory

Phase 4 is an additive code/config change with no rename, no migration, and no externally-stored state that embeds string names. The categories below are answered explicitly per the gsd-phase-researcher convention.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — Phase 4 emits `reports/` artifacts at runtime that are gitignored. No database, no cached configuration, no user_ids. | None |
| Live service config | None — local-first workflow. No external service (n8n, Datadog, Tailscale, etc.) holds Phase 4 state. | None |
| OS-registered state | None — no Task Scheduler, launchd, pm2, systemd unit registrations. The `npm run example:load` / `npm run example:capacity` scripts live in `package.json` (in git). | None |
| Secrets/env vars | None new — Phase 4 introduces no new env var. The four `-e` flags (`BASE_URL`, `K6_PROFILE`, `K6_SCENARIO`, `K6_DEMO`, plus `SCENARIO`) are already plumbed by `perf-runner.mjs::buildK6Args` for ALL profiles uniformly. | None |
| Build artifacts / installed packages | `dist/simulations/load.js` + `dist/simulations/capacity.js` are NEW build outputs that did not exist in Phase 3. `scripts/validate-build.mjs::requiredFiles` must be extended; otherwise a clean clone + `npm run validate:build` would NOT verify they emit. The `PHASE_ONE_SMOKE_ENTRY_FILE` constant in `lib/config/runtime-config.ts:12` has no consumer (verified via Grep: only the runtime-config.ts file itself references it) so D-18 removal is purely a dead-code cleanup, no migration. | (1) Extend `validate-build.mjs::requiredFiles` per CONTEXT D-17(f); (2) delete `PHASE_ONE_SMOKE_ENTRY_FILE` const per D-18 |

**The canonical question — answered:** After every file in the repo is updated, there are no runtime systems holding cached/stored/registered state from a prior Phase. Phase 4 is purely additive.

## Common Pitfalls

### Pitfall 1: browser scenarios don't populate `http_req_*` metrics — D-03 and D-08 thresholds need empirical validation

**What goes wrong:** D-03 specifies `http_req_duration: ['p(95)<2000']` for load and D-08 specifies `http_req_duration: ['p(95)<3000']` for capacity. Both thresholds will trivially PASS regardless of actual page latency because k6 browser scenarios route HTTP through chromium, NOT through `k6/http`. The standard `http_req_*` metrics are reported but their sample count is near-zero.

**Evidence — Phase 03-02 SUMMARY Run 1 (real run vs QAbbalah):**
```
HTTP
http_req_failed.............: 0.00%  0 out of 0     ← 0 samples

BROWSER
browser_http_req_duration...: avg=188.29ms ... p(95)=224.39ms     ← real samples here
browser_http_req_failed.....: 14.28% 1 out of 7                    ← real samples here
```

**Why it happens:** k6's `k6/browser` module bypasses the `k6/http` instrumentation. The `browser_*` metrics are populated by Chrome Devtools Protocol instrumentation in the browser session; the `http_req_*` metrics are populated by the Go-side `k6/http` client. Browser scenarios don't call `k6/http`, so those metrics stay empty.

**How to avoid:** The planner has two options:
- **Option A (CONTEXT-conformant):** Keep D-03 / D-08 verbatim with `http_req_duration`. The threshold passes trivially against a browser scenario but the **markdown summary will note "no samples"** (because `data.metrics.http_req_duration.values` will reflect 0 count). Recruiter sees the threshold in the table; the "actual" column is `n/a (no samples)`. This is honest but means D-03's "load-relevant `http_req_duration` signal" claim is weakened.
- **Option B (recommended, requires CONTEXT re-confirm):** Retarget `http_req_duration` → `browser_http_req_duration` in both D-03 and D-08. Real samples will flow; the threshold becomes a real signal. This is a CHANGE to a locked decision and must be raised back to discuss-phase before adoption.

**Warning signs:** When you run `npm run example:load -- --demo` for the first time and see `http_req_duration..........: avg=0s min=0s med=0s max=0s p(90)=0s p(95)=0s` with `0 out of 0` samples, the threshold is structurally trivial. This is the moment to decide A vs B before locking the simulation file.

**Recommended planner action:** Surface the choice in the plan's Wave 0. Run an exploratory `k6 run` of a draft `load.ts` against the demo URL. Capture the metric values. If `http_req_duration` has 0 samples → flag for discuss-phase before authoring final threshold strings.

### Pitfall 2: `new URL(...)` inside the summary helper will crash k6 — verbatim Plan 03-02 D-01 lesson

**What goes wrong:** Any code path inside `lib/simulations/lib/summary.ts` (or any sibling helper) that uses `new URL(baseUrl)`, `URL.parse(...)`, or `URL.createObjectURL(...)` throws at runtime in k6 1.5 because goja/sobek has no `URL` global.

**Why it happens:** k6 1.5 uses a sobek (forked goja) JavaScript runtime that implements ES2015+ but does NOT ship Web APIs that aren't covered by EcmaScript. `URL` is a Web API.

**How to avoid:** String operations only. The Phase 03-02 deviation in `runtime-config.ts::normalizeBaseUrl` is the codified pattern:
```typescript
const match = /^(https?:\/\/[^/\s]+)(\/.*)?$/iu.exec(baseUrl);
```
If the summary helper needs to display the host portion of the baseUrl in the markdown header, use the same regex shape — or just display the full baseUrl verbatim (simpler and matches the recruiter narrative).

**Warning signs:** Lint/typecheck won't catch this — `lib.dom.d.ts` exposes `URL` to TypeScript. The bug manifests only at k6 run time as `ReferenceError: URL is not defined` or `TypeError: URL is not a constructor`. Mitigation: review every line of `summary.ts` for Web API usage before committing.

### Pitfall 3: `process`, `Buffer`, `process.cwd()` are not goja globals — pure-function carve-out is the safety net

**What goes wrong:** Patterns like ``path.join(process.cwd(), 'reports', `${profile}-${scenario}.md`)`` or `Buffer.from(...)` are second-nature in Node but throw inside k6.

**Why it happens:** Same root as Pitfall 2 — goja is not Node. The k6 process's working directory IS used to resolve relative paths in `handleSummary`'s returned Record<string,string> keys, but k6 owns that resolution; user code doesn't get a `process` global.

**How to avoid:** Construct paths via string concatenation only. The factory closure already captures profile + scenario, so `` `reports/${profile}-${scenario}.md` `` is sufficient. Forward slashes work on Windows under k6.

**Warning signs:** Same as Pitfall 2 — TypeScript doesn't catch it; runtime does.

### Pitfall 4: `__ENV` not populated when read at module top-level

**What goes wrong:** A pattern like `const scenarioId = __ENV.SCENARIO` at module scope reads `undefined`. The factory must read `__ENV` inside its returned function so the value is resolved at handleSummary invocation time, not at import time.

**Why it happens:** k6 imports the module and only then populates `__ENV` from the `-e KEY=VALUE` flags. By the time `handleSummary` runs at end-of-test, `__ENV` is fully populated.

**How to avoid:** The `scenarioGetter: () => __ENV.SCENARIO ?? 'home-smoke'` pattern in the factory contract. Each simulation entry passes a thunk, not a value. (Smoke.ts already does this for the default fn — reads `__ENV.SCENARIO` inside the function body, not at module scope.)

**Warning signs:** Markdown filename comes out as `reports/load-undefined.md` instead of `reports/load-home-smoke.md`.

### Pitfall 5: throwing inside `handleSummary` doesn't fail the test, but writes nothing

**What goes wrong:** If the markdown formatter throws (e.g., on a malformed `data.metrics` entry), `handleSummary` returns nothing — no `.md` and no `.json` artifact is written, AND k6 still reports exit 0 if all thresholds passed.

**Why it happens:** `handleSummary` runs AFTER the test body completes; an exception here is logged but doesn't affect the exit-code contract.

**How to avoid:** Defensive coding inside the formatters. The pure functions should tolerate missing metrics (e.g., `data.metrics.http_req_duration?.values?.['p(95)']` not `data.metrics.http_req_duration.values['p(95)']`). The unit tests should explicitly include a "browser scenario data with empty http_req_*" fixture (mirror the Phase 03-02 SUMMARY Run 1 shape) to catch this regression.

**Warning signs:** `reports/` directory exists but no files inside, or only some files. Manual smoke run completes "successfully" but the recruiter artifact is missing.

### Pitfall 6: ramping-arrival-rate with `maxVUs === preAllocatedVUs` becomes hard-capped — D-07 calibration risk

**What goes wrong:** D-07 sets `preAllocatedVUs: 10, maxVUs: 10`. When the target iter/s × actual iteration duration exceeds the VU pool, k6 cannot scale up beyond the cap. The arrival-rate executor "falls behind" — actual iter/s never reaches the target. From a metrics standpoint this looks like `iteration_duration` ramps up while iter/s stops growing.

**Why it happens:** Each chromium iteration takes ~2-5 seconds (Phase 03-02 SUMMARY Run 2: `iteration_duration=4.51s` for a two-POM journey). At 10 iter/s target and 4.5s per iteration, the steady-state VU requirement is ~45 — but maxVUs caps at 10. So at ~2 iter/s the system saturates and the executor cannot ramp further.

**How to avoid:** This is intentional per D-05 — capacity semantics are "find-the-breaking-point". The "breaking point" the recruiter sees IS the executor falling behind. The markdown summary should call out the metric pair: `iteration_duration` ramping up + `iterations` count plateauing = capacity ceiling discovered.

**Warning signs (this is the desired narrative):** Recruiter reads the markdown and sees `iteration_duration p(95) = 28s` with a SOFT threshold trip on `p(95)<30000`. The narrative footer can say "iteration_duration p(95) tripped near the iter/s ceiling — capacity envelope identified." Phase 4 CONTEXT specifies this is the intended outcome (D-05).

**Recommended planner action:** Calibrate empirically. Run capacity once with the locked D-07 stage; if no threshold trips at 10 iter/s × 180s, bump the peak target or duration. This is explicitly called out in CONTEXT §Specifics.

## Code Examples

Verified patterns from official sources + project-local proven shapes.

### Example 1: ramping-vus executor with browser module (D-01 + D-03)

```typescript
// Source: lib/simulations/load.ts (NEW — Phase 4 hand-authored)
// Adapted from: https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/ramping-vus/
// Cross-verified against: lib/simulations/smoke.ts shape (Phase 3 D-63..D-67)

export const options = {
  scenarios: {
    browser: {
      executor: 'ramping-vus',
      startVUs: 0,                                        // [CITED: k6 docs default is 1; explicit 0 matches the "ramp from zero" narrative]
      stages: [
        { duration: '30s', target: 5 },                   // ramp up
        { duration: '60s', target: 5 },                   // hold
        { duration: '30s', target: 0 },                   // ramp down
      ],
      gracefulRampDown: '30s',                            // [CITED: k6 docs default]
      options: { browser: { type: 'chromium' } },         // [VERIFIED: smoke.ts:30-31 working pattern]
    },
  },
  thresholds: {
    browser_web_vital_lcp: ['p(95)<4000'],
    http_req_failed: ['rate<0.05'],
    iteration_duration: ['p(95)<25000'],
    http_req_duration: ['p(95)<2000'],                    // ⚠ see Pitfall 1 — may have 0 samples
  },
};
```

### Example 2: ramping-arrival-rate executor with browser module (D-06 + D-07 + D-08)

```typescript
// Source: lib/simulations/capacity.ts (NEW — Phase 4 hand-authored)
// Adapted from: https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/ramping-arrival-rate/

export const options = {
  scenarios: {
    browser: {
      executor: 'ramping-arrival-rate',
      startRate: 0,                                       // iter/s at t=0
      timeUnit: '1s',                                     // [CITED: k6 docs default]
      preAllocatedVUs: 10,                                // [CITED: required field — k6 docs]
      maxVUs: 10,                                         // hard cap = the calibration ceiling per D-07
      stages: [
        { duration: '180s', target: 10 },                 // 0 → 10 iter/s over 3 min
      ],
      options: { browser: { type: 'chromium' } },
    },
  },
  thresholds: {
    browser_web_vital_lcp: ['p(95)<4000'],
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<3000'],                    // ⚠ see Pitfall 1
    iteration_duration: ['p(95)<30000'],
  },
};
```

### Example 3: `handleSummary` Record<string,string> return shape

```typescript
// Source: https://grafana.com/docs/k6/latest/results-output/end-of-test/custom-summary/
// Verified-by-doc: keys are file paths (relative to cwd), values are string-or-ArrayBuffer.

export function handleSummary(data) {
  return {
    'reports/load-home-smoke.md':   '# Load run vs ...\n...',
    'reports/load-home-smoke.json': JSON.stringify(data, null, 2),
    'stdout':                       textSummary(data, { indent: ' ' }),  // [OPTIONAL — preserves the default k6 console summary]
  };
}
```

**Path resolution rule** [CITED: k6 docs + verified empirically via `perf-runner.mjs:113` setting `cwd: projectRoot`]:
- Relative paths resolve against the k6 process working directory.
- `scripts/perf-runner.mjs` spawns k6 with `cwd: projectRoot`, so `reports/load-home-smoke.md` lands at `<repo-root>/reports/load-home-smoke.md` on Win/Mac/Linux uniformly.
- Forward slashes work cross-platform; do NOT use backslashes in path keys.

### Example 4: data.metrics shape for threshold-table rendering

```javascript
// Source: https://grafana.com/docs/k6/latest/results-output/end-of-test/custom-summary/ (abridged docs sample)
// Sample of what data.metrics looks like inside handleSummary:

{
  "metrics": {
    "browser_web_vital_lcp": {
      "type": "trend",
      "contains": "time",
      "values": {
        "avg": 572,                   // milliseconds (k6 stores trends in ms)
        "min": 572, "max": 572, "med": 572,
        "p(90)": 572, "p(95)": 572
      },
      "thresholds": {
        "p(95)<4000": { "ok": true }   // ← key is the literal threshold string from options.thresholds
      }
    },
    "http_req_failed": {
      "type": "rate",
      "contains": "default",
      "values": { "rate": 0.0, "passes": 0, "fails": 0 },
      "thresholds": {
        "rate<0.05": { "ok": true }
      }
    },
    "iteration_duration": {
      "type": "trend",
      "contains": "time",
      "values": { "avg": 2310, "min": 2310, "max": 2310, "med": 2310, "p(90)": 2310, "p(95)": 2310 },
      "thresholds": {
        "p(95)<25000": { "ok": true }
      }
    },
    "browser_data_received": {
      "type": "counter",
      "contains": "data",
      "values": { "count": 1800000, "rate": 640000 }   // bytes
    }
  }
}
```

**Markdown formatter walking pattern (recommended pure-function shape):**
```typescript
// Source: lib/simulations/lib/format-md.ts (NEW — Phase 4)
// Pure function — Node-unit-testable

export function formatMarkdown(data: K6SummaryData, meta: FormatMeta): string {
  const lines: string[] = [];

  // Header
  lines.push(`# ${meta.profile} run — ${meta.scenario}`);
  lines.push('');
  lines.push(`- Profile: \`${meta.profile}\``);
  lines.push(`- Scenario: \`${meta.scenario}\``);
  lines.push(`- Base URL: ${meta.baseUrl}`);
  lines.push(`- Run date: ${meta.runDateIso}`);
  lines.push('');

  // What ran (recruiter narrative — D-11)
  lines.push('## What ran');
  lines.push('');
  lines.push(describeProfile(meta.profile));            // pure helper, e.g., "5 VUs, 2 min ramping load"
  lines.push('');

  // Thresholds table (D-11)
  lines.push('## Thresholds');
  lines.push('');
  lines.push('| Metric | Bound | Actual | Verdict |');
  lines.push('|---|---|---|---|');
  for (const [metricName, metric] of Object.entries(data.metrics ?? {})) {
    if (!metric?.thresholds) continue;
    for (const [bound, result] of Object.entries(metric.thresholds)) {
      const actual = pickActualForBound(metric, bound);  // pure helper
      const verdict = result.ok ? '✅ PASS' : '❌ FAIL';
      lines.push(`| \`${metricName}\` | \`${bound}\` | ${actual} | ${verdict} |`);
    }
  }
  lines.push('');

  // Key metrics table (D-11)
  lines.push('## Key metrics');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|---|---|');
  lines.push(`| LCP p(95) | ${fmtMs(data.metrics?.browser_web_vital_lcp?.values?.['p(95)'])} |`);
  lines.push(`| iteration_duration p(95) | ${fmtMs(data.metrics?.iteration_duration?.values?.['p(95)'])} |`);
  lines.push(`| http_req_failed rate | ${fmtRate(data.metrics?.http_req_failed?.values?.rate)} |`);
  const hrd = data.metrics?.http_req_duration?.values?.['p(95)'];
  if (typeof hrd === 'number' && hrd > 0) {
    lines.push(`| http_req_duration p(95) | ${fmtMs(hrd)} |`);
  } else {
    lines.push('| http_req_duration p(95) | n/a (no samples — browser scenario) |');
  }
  lines.push(`| browser_data_received total | ${fmtBytes(data.metrics?.browser_data_received?.values?.count)} |`);
  lines.push('');

  // Footer (D-11)
  lines.push('---');
  lines.push(`Raw data: \`reports/${meta.profile}-${meta.scenario}.json\``);

  return lines.join('\n');
}
```

### Example 5: GitHub Markdown pipe-escape (for `|` in metric values)

GitHub renders pipe characters inside table cells correctly when they're either escaped as `\|` or wrapped in backticks (`` ` ``). The pattern above wraps metric names and threshold strings in backticks, which avoids the issue entirely — `p(95)<3000` lives inside `` `p(95)<3000` ``. No metric NAME or VALUE in k6 contains `|` by default (LCP is `p(95)=572ms`, http_req_failed is `rate=0.05`), so this is largely defensive. Unit test recommendation: include one fixture entry whose stringified value contains `|` (synthetic) to prove the escape path works.

### Example 6: package.json scripts ordering for recruiter readability (D-13)

```jsonc
// Source: package.json (Phase 4 MODIFIED)
// Order optimized for recruiter inspection — supported workflows first, examples second, infra third.
{
  "scripts": {
    "smoke":            "node scripts/perf-runner.mjs --profile smoke --demo",
    "example:load":     "node scripts/perf-runner.mjs --profile load --demo",
    "example:capacity": "node scripts/perf-runner.mjs --profile capacity --demo",
    "perf":             "node scripts/perf-runner.mjs",
    "build":            "vite build",
    "build:watch":      "vite build --watch",
    "validate:build":   "node scripts/validate-build.mjs",
    "sync:src":         "node scripts/sync-src.mjs",
    "convert-pages":    "node scripts/convert-pages.mjs"
  }
}
```

**Rationale:** A recruiter inspecting `package.json` reads top-to-bottom. The first three lines tell the whole performance-workflow story: smoke is supported, load + capacity are explicitly labeled examples. `perf` (raw) follows as the escape-hatch. Build + sync infra at the bottom is the standard "tooling, not the show" placement.

### Example 7: validate-build.mjs strict requiredFiles (CONTEXT D-17(f) recommendation)

```javascript
// Source: scripts/validate-build.mjs (Phase 4 MODIFIED — strict list per CONTEXT recommendation)
const requiredFiles = [
  'dist/simulations/smoke.js',
  'dist/simulations/load.js',          // NEW Phase 4
  'dist/simulations/capacity.js',      // NEW Phase 4
  'scripts/perf-runner.mjs',
  '.env.example',
  'lib/config/runtime-config.ts',
];
```

**Rationale (CONTEXT recommendation, confirmed):** Every npm script in the public surface (smoke + example:load + example:capacity) MUST produce a build output. Strict validation prevents a regression where a typo in `lib/simulations/load.ts` silently drops the entry from the Vite glob but `npm run example:load` still appears in `package.json`. The recruiter would hit "Build artifact not found: dist/simulations/load.js" instead of `npm run validate:build` catching it in CI/local. Strict is the right call.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| k6 v0.45-era summary handled via `--summary-export=path.json` CLI flag | k6 1.x `handleSummary(data) => Record<string, string>` | k6 0.30+ | Single hook controls all artifact emission; multi-file output natively supported |
| Goja JavaScript runtime | Sobek (k6's fork of goja) | k6 0.52 (2024) | Internal change — same API surface; same goja-style restrictions (no URL, no Buffer, no fs) |
| k6 browser as separate xk6 extension (`xk6-browser`) | k6 browser module bundled in core k6 binary | k6 0.46+ (graduated) | `npm run smoke` just works against `k6 v1.5.0` — no xk6 build step needed |
| `k6/experimental/browser` import path | `k6/browser` import path | k6 1.0 (2024) | `lib/simulations/smoke.ts:1` uses `from 'k6/browser'` — correct stable path. Phase 4 entries do the same. |

**Deprecated/outdated:**
- `xk6-browser` standalone binary — superseded by core k6 1.x with bundled browser. Do NOT install `xk6-browser` separately.
- `k6/experimental/browser` import — use `k6/browser`.
- `summaryTrendStats: ['avg', 'min', 'med', 'max']` (legacy) — k6 1.5 defaults are sensible; only override if the markdown table needs additional percentiles.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Browser scenarios in k6 1.5 leave `http_req_duration` empty (0 samples) — Phase 03-02 SUMMARY Run 1 evidence supports this for the smoke profile, and the same routing applies to load/capacity. | §5 Pitfall 1 | If wrong, D-03/D-08 thresholds become real signals as written and Pitfall 1 is unnecessary — no harm done. If right (very likely based on evidence), Phase 4 surfaces this empirically in Wave 0 and planner picks Option A vs B. |
| A2 | `handleSummary` runs inside the same goja runtime as the test body. | §2 (Standard Stack), §5 Pitfall 2 | Highly unlikely to be wrong — `handleSummary` is part of k6's JavaScript API surface, ALL of which is goja/sobek. If somehow it ran in a different context, the formatter could safely use Node APIs. Documentation is silent on this specific point, but the architecture leaves no plausible alternative. [VERIFIED via cross-referencing: docs explicitly cite the function alongside other goja-runtime APIs.] |
| A3 | Vite's `globSync('./lib/simulations/**/*.ts')` auto-picks `load.ts` + `capacity.ts` with no config edit. | §2 + §3 Pattern 1 | Verified by reading `vite.config.ts:32` — the glob is already in place. Phase 3 D-62 promise being collected. Zero risk. |
| A4 | k6's `handleSummary` is the documented contract in k6 1.5.x and writes files reliably across Win/Mac/Linux. | §2 + §6 Example 3 | Confirmed via official Grafana docs; the contract is k6-binary-side (Go code) writing files, not user-code-side. Cross-platform is k6's responsibility. Low risk. |
| A5 | Date.now() / new Date().toISOString() are available in goja. | §3 Pattern 2 | Standard EcmaScript 5.1+ feature; goja implements it. No specific k6 doc citation needed; verified empirically via Phase 03-02 Run logs which print ISO timestamps from k6's own log machinery. |
| A6 | The markdown formatter signature `(data, meta) => string` and JSON formatter `(data) => string` are pure functions that can be Node-unit-tested without goja stubs. | §3 + §6 Example 4 | Pure-function carve-out is conventional and Phase 1-3 use the same pattern (e.g., `normalizeBaseUrl` is unit-tested as a pure function). Zero risk. |

## Open Questions (RESOLVED)

**Resolution Summary (2026-05-11):** All 4 questions resolved before planning. Q1 via CONTEXT amendment (D-03/D-08/D-11 retargeted to `browser_http_req_duration` — commit c007200). Q2-Q4 via plan body decisions (Plan 04-01 Task 2 formatter spec + Plan 04-02 Task 4 verify-wave calibration). Empirical confirmation of Q1 folded into Plan 04-02 Task 4 verify-wave as post-hoc evidence (the metric choice is already locked).

1. **D-03 / D-08 `http_req_duration` threshold target — keep verbatim or retarget to `browser_http_req_duration`?**
   - **RESOLVED:** Retargeted to `browser_http_req_duration`. CONTEXT.md D-03/D-08/D-11 amended 2026-05-11 with provenance (commit c007200). Plan 04-02 Task 1 encodes the amended threshold strings verbatim plus negative-space anti-regression assertions.

2. **Should the markdown formatter handle the "0 samples — threshold trivially passed" case differently from the "real samples — threshold passed" case?**
   - **RESOLVED:** Yes — annotate with `n/a (no samples — browser scenario)` when count is 0. Plan 04-01 Task 2 acceptance criteria mandates this; PATTERNS.md CC-1 covers the pure-function defensive-chaining pattern. Recruiter-readable transparency over false confidence.

3. **Capacity threshold trip — what if 10 iter/s × 180s doesn't trip ANY threshold against QAbbalah's CDN-cached steady state?**
   - **RESOLVED:** Calibration call deferred to Plan 04-02 Task 4 (verify-wave checkpoint). Real-run evidence drives any post-hoc bump per CONTEXT §Specifics. Wave 0 empirical dry-run skipped because CONTEXT D-07 already locks initial ramp parameters; reviewers see the calibration story in the SUMMARY.md when it lands.

4. **Markdown formatter — handle `data.options.summaryTrendStats` mismatch?**
   - **RESOLVED:** Safe optional chaining mandated by Plan 04-01 Task 2 acceptance criteria (`data.metrics?.<metric>?.values?.['p(95)'] ?? 'n/a'`). PATTERNS.md CC-1 codifies the defensive-chaining rule for the pure formatters.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| k6 binary | runtime execution | ✓ | 1.5.0 (windows/amd64, per Phase 03-02 SUMMARY) | — |
| Node.js | build + tests + runner | ✓ | 22.20.0 | — |
| npm | scripts | ✓ | 11.6.1 | — |
| chromium (bundled with k6 browser) | browser scenarios | ✓ (proven by Phase 03-02 real runs) | — | — |
| `typescript@5.9.3` | build + test loader | ✓ | 5.9.3 | — |
| `vite@5.4.21` | build | ✓ | 5.4.21 | — |
| GitHub Pages reachability (https://othrondir.github.io/QAbbalah/) | demo runs | ✓ (verified by Phase 03-02 Runs 1+2) | — | Skip real runs; write fixtures-only manual evidence (degraded recruiter narrative — not preferred) |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None — environment fully provisioned.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node `node:test` 22.20.0 (bundled with Node) |
| Config file | none — `tests/unit/*.test.mjs` + `tests/integration/*.test.mjs` are discovered by glob; existing Phase 1-3 convention |
| Quick run command | `node --test tests/unit/*.test.mjs` |
| Full suite command | `node --test tests/unit/*.test.mjs tests/integration/*.test.mjs` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PROF-02 | `lib/simulations/load.ts` exports `options` with `ramping-vus` executor, 3 stages [30s→5, 60s@5, 30s→0], chromium browser type | unit | `node --test tests/unit/simulations-load.test.mjs` | ❌ Wave 0 |
| PROF-02 | `lib/simulations/load.ts` exports `options.thresholds` with D-03 verbatim strings | unit | `node --test tests/unit/simulations-load.test.mjs` | ❌ Wave 0 |
| PROF-02 | `lib/simulations/load.ts` default fn dispatches via `SCENARIO_REGISTRY[__ENV.SCENARIO]` with `exec.test.abort` fail-fast | unit | `node --test tests/unit/simulations-load.test.mjs` | ❌ Wave 0 |
| PROF-02 | `dist/simulations/load.js` emits from `npm run build` | integration | `npm run build && node --test tests/unit/simulations-emit.test.mjs` | ❌ Wave 0 |
| PROF-02 | `npm run example:load` runs `perf-runner.mjs --profile load --demo` and resolves to `dist/simulations/load.js` (dry-run-asserted) | unit | extend `tests/unit/perf-runner.test.mjs` with a `--profile load --dry-run` assertion | ❌ Wave 0 (extend existing file) |
| PROF-02 | Real `npm run example:load -- --demo` completes the 2-minute ramp against QAbbalah | manual checkpoint | manual run + capture stdout to plan SUMMARY | n/a (manual) |
| PROF-03 | `lib/simulations/capacity.ts` exports `options` with `ramping-arrival-rate`, startRate=0, target=10, preAllocatedVUs=10, maxVUs=10, duration=180s | unit | `node --test tests/unit/simulations-capacity.test.mjs` | ❌ Wave 0 |
| PROF-03 | `lib/simulations/capacity.ts` exports D-08 thresholds verbatim | unit | `node --test tests/unit/simulations-capacity.test.mjs` | ❌ Wave 0 |
| PROF-03 | `dist/simulations/capacity.js` emits from `npm run build` | integration | (shares the simulations-emit test) | ❌ Wave 0 |
| PROF-03 | Real `npm run example:capacity -- --demo` completes the 3-minute ramp; at least one capacity threshold trip is captured in summary | manual checkpoint | manual run + capture stdout to plan SUMMARY | n/a (manual) |
| PROF-04 | `lib/simulations/lib/summary.ts::makeHandleSummary({...})` returns a function that, given a sample k6 `data` payload, produces a `Record<string, string>` with two keys matching `reports/<profile>-<scenario>.md` and `reports/<profile>-<scenario>.json` | unit | `node --test tests/unit/summary-make.test.mjs` | ❌ Wave 0 |
| PROF-04 | Markdown formatter emits the D-11 5-section structure (header / what ran / thresholds table / key metrics table / footer) for a Run-1-shape data payload | unit | `node --test tests/unit/summary-format-md.test.mjs` | ❌ Wave 0 |
| PROF-04 | Markdown formatter handles "0 samples" gracefully — http_req_duration with 0 count renders as `n/a (no samples — browser scenario)` instead of NaN | unit | `node --test tests/unit/summary-format-md.test.mjs` | ❌ Wave 0 |
| PROF-04 | Markdown formatter renders threshold verdict as ✅ PASS / ❌ FAIL based on `data.metrics[X].thresholds[bound].ok` | unit | `node --test tests/unit/summary-format-md.test.mjs` | ❌ Wave 0 |
| PROF-04 | JSON formatter returns `JSON.stringify(data, null, 2)` (or equivalent indented JSON) | unit | `node --test tests/unit/summary-format-json.test.mjs` | ❌ Wave 0 |
| PROF-04 | Smoke regression: `npm run smoke` after `smoke.ts` wires through the new `makeHandleSummary` still passes all 3 D-66 thresholds | manual checkpoint | manual smoke run + confirm `reports/smoke-home-smoke.md` written | n/a (manual) |
| PROF-04 | All three real runs (smoke, load, capacity) produce both `.md` and `.json` artifacts in `reports/` (the artifact pair) | manual checkpoint | filesystem check + open `.md` in GitHub view to confirm rendering | n/a (manual) |
| D-18 cleanup | `PHASE_ONE_SMOKE_ENTRY_FILE` constant is removed from `runtime-config.ts`; no consumer breaks | unit | re-run full `tests/unit/runtime-config.test.mjs` after deletion (verified to only import `SMOKE_ENTRY_FILE`, not the legacy one) | ✅ existing test covers regression |
| D-17(f) validate-build | `scripts/validate-build.mjs::requiredFiles` includes `dist/simulations/load.js` and `dist/simulations/capacity.js`; `npm run validate:build` is green after `npm run build` | integration | `npm run build && npm run validate:build` | ✅ existing (extended) |
| D-15 README quickstart | README contains a 3-row "Supported vs Example" table marking smoke=Supported, load=Example, capacity=Example | doc-presence | grep-style assertion in a doc test, OR human review in plan SUMMARY (Phase 5 owns prose polish, Phase 4 only owns the table contract) | ❌ Wave 0 (recommend lightweight grep assertion) |

### Sampling Rate
- **Per task commit:** `node --test tests/unit/*.test.mjs` (fast — pure functions + TS-loader patterns)
- **Per wave merge:** `node --test tests/unit/*.test.mjs tests/integration/*.test.mjs && npm run build && npm run validate:build`
- **Phase gate:** Full suite green + 3 real-run manual evidence (smoke + load + capacity) + filesystem check that 6 artifacts (3 × `.md` + 3 × `.json`) exist before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `tests/unit/summary-format-md.test.mjs` — pure-function markdown formatter tests; fixtures include a smoke-shape data payload (0-sample http_req_*) and a load-shape data payload (real http_req_duration samples if Option B is chosen, or 0 samples if Option A)
- [ ] `tests/unit/summary-format-json.test.mjs` — JSON formatter tests; assert deterministic output for a fixture
- [ ] `tests/unit/summary-make.test.mjs` — `makeHandleSummary({...})` factory tests; assert returned function produces a `Record<string,string>` with the two expected keys based on metadata
- [ ] `tests/unit/simulations-load.test.mjs` — load options shape + D-03 thresholds + ramping-vus stages + chromium browser type
- [ ] `tests/unit/simulations-capacity.test.mjs` — capacity options shape + D-08 thresholds + ramping-arrival-rate + preAllocatedVUs/maxVUs
- [ ] `tests/unit/simulations-emit.test.mjs` — vite-build assertion that `dist/simulations/load.js` + `dist/simulations/capacity.js` exist after `npm run build`
- [ ] Extend `tests/unit/perf-runner.test.mjs` with `--profile load --dry-run` and `--profile capacity --dry-run` cases asserting the entry file path resolves correctly
- [ ] No new framework install needed — `node --test` + `typescript` + the multi-source data-URL loader pattern are all in place

## Project Constraints (from CLAUDE.md)

| Constraint | How Phase 4 Honors It |
|-----------|------------------------|
| Smoke must work end to end; load + capacity may remain example code | Smoke regression gate runs after Phase 4 (manual + automated). Load + capacity are LABELED examples via D-13/D-14/D-15 (3 orthogonal signals). |
| Recruiter-readable showcase quality | Markdown summary (D-11) emits a curated narrative, not raw k6 stdout. Package.json script ordering (Example 6) tells the workflow story top-down. README quickstart table makes scope explicit. |
| Local-first workflow | No new dependencies; no Kubernetes; no cloud k6; reports written to local `reports/` directory; pure `npm run` workflow. |
| Use Vite bundling | Existing glob auto-picks new entries; D-17(f) extends `validate-build.mjs` strict-list. |
| TypeScript source + generated k6 layer | All Phase 4 source is TypeScript under `lib/`; emits to `dist/simulations/*.js`. |
| Scripted sync from `easyPlaywright` (never manual copy) | Out of Phase 4 scope — no scenario changes; registry consumed unchanged. |
| Avoid hard-coded test target values in scenario files | Threshold values live in `lib/simulations/<profile>.ts` `options.thresholds` (CONTEXT D-03/D-08 locked). BASE_URL flows through runtime-config — no hard-codes. |
| Don't copy enterprise complexity from `ir-perf-k6` | Phase 4 deliberately ships no `SCENARIO_MODE`, no `TOTAL_VUS` distribution, no two-phase capacity, no jslib HTML reporter. Deferred Ideas list keeps the boundary explicit. |
| Reference architecture (smoke first, lightweight) | Phase 4 only adds 5-7 new files. Smoke remains 1 VU / 1 iter; load/capacity sit as illustrative examples behind explicit npm script labels. |

## Security Domain

Phase 4 introduces no new security surface. The work is:
- Two new TypeScript simulation entries (no network endpoints exposed; no user input parsing)
- One shared TS helper (pure functions, no I/O except through the k6 `handleSummary` return contract)
- One npm-script addition + one validate-build list update + one README table

ASVS categories considered:

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No auth surface introduced |
| V3 Session Management | no | No sessions |
| V4 Access Control | no | No access-controlled resources |
| V5 Input Validation | yes (minor) | `runtime-config.ts::normalizeBaseUrl` regex already validates BASE_URL; Phase 4 introduces no new input. The `__ENV.SCENARIO` value is validated by `SCENARIO_REGISTRY` lookup with `exec.test.abort` fail-fast (Phase 3 D-55 / D-A4) — unchanged. |
| V6 Cryptography | no | No crypto |
| V7 Error Handling | yes (minor) | The shared `makeHandleSummary` factory uses defensive optional-chaining (`data.metrics?.X?.values?.['p(95)']`) so a malformed `data` payload never throws inside the summary helper. See Pitfall 5. |
| V14 Configuration | yes | All threshold values + executor stages live in source — no remote config loading, no eval. |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Path injection via `__ENV.SCENARIO` (e.g., `../../etc/passwd`) breaking the `reports/<profile>-<scenario>.md` filename | Tampering | The summary helper uses `__ENV.SCENARIO` as part of a path. Even though k6 itself sandboxes file writes to relative cwd, the **planner should consider whether to validate/normalize the scenario id** before using it in the path key. Defensive recommendation: `/^[a-z0-9-]+$/` regex check on the resolved scenario id — anything else falls back to `'unknown'`. The scenario id is ALREADY constrained to a registry key (kebab-case slugs, Phase 3 D-52) so this is paranoid defense, but worth a 3-line gate. |
| Resource exhaustion via capacity ramp on a developer laptop | DoS | D-07 explicitly caps `maxVUs: 10` and `duration: 180s` — bounded by design. RAM ceiling is calibrated for 16 GB laptops (Phase 4 CONTEXT D-07). |

## Sources

### Primary (HIGH confidence)
- Grafana k6 official docs:
  - https://grafana.com/docs/k6/latest/results-output/end-of-test/custom-summary/ — `handleSummary` contract, Record<string,string> return shape, sample data.metrics structure with `thresholds[bound].ok`
  - https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/ramping-vus/ — verbatim `ramping-vus` config + 3-stage example matching D-01 shape
  - https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/ramping-arrival-rate/ — verbatim `ramping-arrival-rate` config + `preAllocatedVUs` required flag
  - https://grafana.com/docs/k6/latest/using-k6-browser/ — browser metrics naming (browser_web_vital_*, browser_http_*, browser_data_*)
  - https://grafana.com/docs/k6/latest/using-k6-browser/metrics/ — browser metric definitions
  - https://grafana.com/docs/k6/latest/javascript-api/k6-execution/ — `exec.test.abort` signature, `exec.scenario` properties
  - https://pkg.go.dev/go.k6.io/k6/errext/exitcodes — verified k6 exit codes (99 = ThresholdsHaveFailed, 108 = ScriptAborted, 110 = MarkedAsFailed)
- Project-local proven shapes:
  - `lib/simulations/smoke.ts` (Phase 3) — direct reference for load.ts + capacity.ts dispatch shape
  - `lib/scenarios/index.ts` — registry consumed unchanged
  - `scripts/perf-runner.mjs::buildK6Args` — env plumbing already includes the 5 `-e` flags every simulation needs
  - `.planning/phases/03-smoke-scenarios-supported-execution/03-02-SUMMARY.md` — empirical evidence of: (1) `http_req_*` metrics empty in browser scenarios (Run 1), (2) k6 exit codes 0 / 108 / 1 working in practice (Run 3), (3) goja runtime caveats codified in Plan 03-02 deviation patches
  - `tests/unit/scenarios-registry.test.mjs:23-180` — multi-source data-URL loader pattern Phase 4 unit tests reuse for `summary.ts` loading

### Secondary (MEDIUM confidence)
- Grafana k6 thresholds page (https://grafana.com/docs/k6/latest/using-k6/thresholds/) — confirms soft-threshold contract (omit `abortOnFail`), confirms predicate syntax (`p(95)<3000`, `rate<0.05`)
- Stack Overflow + Grafana Community Forum cross-references for k6 browser + ramping-arrival-rate compatibility — multiple users confirm compatibility but no single authoritative doc cite

### Tertiary (LOW confidence)
- None — every Phase 4 claim is supported by official docs, project-local Phase 03-02 empirical evidence, or the cited Go source package for exit codes.

## Metadata

**Confidence breakdown:**
- Standard stack (k6 1.5, executors, handleSummary): HIGH — official docs + project-local proven shapes
- Architecture (factory pattern, pure-function carve-out): HIGH — conventional pattern; Phase 1-3 precedent
- Pitfalls (browser metrics divergence, goja restrictions): HIGH — Phase 03-02 empirical evidence + verified Grafana docs
- Threshold values (D-03 / D-08 verbatim): MEDIUM — locked in CONTEXT but Pitfall 1 surfaces a live risk needing Wave 0 empirical validation
- Markdown formatter exact shape: HIGH — D-11 specifies columns; Claude's discretion on ordering is encoded in §6 Example 4 sample

**Research date:** 2026-05-11
**Valid until:** 2026-06-10 (30 days — k6 1.5 stable release line; goja/sobek behavior stable across minor releases)
