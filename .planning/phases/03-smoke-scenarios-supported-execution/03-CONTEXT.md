# Phase 3: Smoke Scenarios & Supported Execution - Context

**Gathered:** 2026-05-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a recruiter-launchable smoke browser performance workflow: a central scenario registry exposing kebab-case IDs, one simulation entrypoint that dispatches to the right journey, and a smoke profile with deterministic low-resource k6 options. Smoke journeys hit the QAbbalah demo target using the Phase 2 generated POMs and the K6Page contract.

This phase delivers BUILD-03, SCEN-01, SCEN-02, SCEN-03, PROF-01.

Out of scope: load/capacity profile examples (Phase 4 PROF-02/PROF-03), rich reviewer-friendly output surface (Phase 4 PROF-04), CI/Docker workflow, Grafana export. Phase 3 ships exactly the smoke path that matches success criteria 1-4 of ROADMAP Phase 3.

</domain>

<decisions>
## Implementation Decisions

### Scenario registry shape (SCEN-01, SCEN-03)
- **D-51:** The registry is a single TypeScript map at `lib/scenarios/index.ts` exporting `SCENARIO_REGISTRY: Record<string, { fn, description, pages }>`. New scenarios = one import + one entry. Recruiter scans one file to see every available scenario.
- **D-52:** Scenario IDs are kebab-case slugs: `home-smoke`, `blog-post-smoke`. Used verbatim as the `--scenario <id>` CLI value. Matches the ir-perf precedent and stays shell/URL safe.
- **D-53:** The default scenario when `npm run smoke` runs without `--scenario` is `home-smoke`, which calls `homePage.measureNavigation()` to exercise the Phase 2 `lib/pages-k6-patches/HomePage.k6-patch.ts` patch end-to-end. This replaces the `smoke-shell` placeholder currently in `lib/config/runtime-config.ts:DEFAULT_SCENARIO`.
- **D-54:** Single scenario per run in v1. `--scenario` resolves to exactly one entry in the registry. Multi-scenario selection (comma-list, ir-perf SCENARIOS=a,b style) is deferred — see Deferred Ideas.
- **D-55:** Unknown `--scenario <id>` fails fast: runner exits non-zero, prints `Unknown scenario '<id>'. Available: home-smoke, blog-post-smoke`. Mirrors the Phase 1 D-13 fail-fast precedent for invalid real-target config.

### Smoke journey content (SCEN-02)
- **D-56:** Two scenarios ship in v1: `home-smoke` (exercises `HomePage` + the demo patch) and `blog-post-smoke` (exercises `HomePage` then `PostPage`). `AboutPage` stays generated but unused — proves the converter handles more POMs than the scenarios consume, no maintenance cost.
- **D-57:** Each journey is "navigate + assert visible components". A scenario calls `page.navigate()`, `page.waitForLoadState()`, then 2-3 visibility assertions via the `K6PlaywrightSelectors` shim on key components from `lib/pages/components/` (e.g., navigation, masthead, blogPosts). This exercises the K6Page contract + the selector shim + the component composition end-to-end without scenario-side complexity.
- **D-58:** Single `sleep(1)` pacing between major steps. No `SCENARIO_MODE` env var, no fast/realistic toggle. Recruiter-readable, still finishes in seconds.
- **D-59:** Error behavior is k6 default: any thrown exception propagates, k6 marks the iteration failed, the stack lands in the console summary. No try/catch wrap, no screenshot-on-error in v1 (Phase 4 owns artifact handling).

### Simulation entrypoint + k6 wiring (BUILD-03)
- **D-60:** Single simulation entry at `lib/simulations/smoke.ts`. It reads `__ENV.SCENARIO` (defaulting to `home-smoke`), looks up `SCENARIO_REGISTRY[id].fn`, and invokes it inside the k6 default-export function. One entry, registry-dispatch — mirrors ir-perf `frontend-performance-simulation.test.ts` shape.
- **D-61:** `scripts/perf-runner.mjs` passes the scenario ID to k6 as a k6 env var: `k6 run -e SCENARIO=<id> dist/simulations/smoke.js`. k6-native, no rebuild required when the user changes `--scenario` at the CLI.
- **D-62:** Source-to-dist mapping: `lib/simulations/smoke.ts` builds to `dist/simulations/smoke.js`. `lib/config/runtime-config.ts:resolveEntryFile()` is updated to point at `dist/simulations/<profile>.js` (keyed by profile, not scenario, because all scenarios share the smoke entry). Vite config gains `lib/simulations/smoke.ts` as an entry. `tests/` stays reserved for Node unit tests — no `.test.ts` collision with k6 entries.
- **D-63:** k6 options for the smoke profile live as `export const options = { ... }` directly in `lib/simulations/smoke.ts`. Self-contained: scenario shape, thresholds, browser executor config all in the file the entrypoint runs. Phase 4's load/capacity entries will follow the same pattern in their own `lib/simulations/<profile>.ts` files.

### Smoke profile semantics (PROF-01)
- **D-64:** 1 VU, 1 iteration. One full journey end-to-end, deterministic, finishes in seconds. Satisfies PROF-01 "deterministic low-resource settings suitable for demos."
- **D-65:** Browser scenario executor type is `shared-iterations`. Single VU consumes the fixed iteration count. k6 browser idiomatic; pairs naturally with the 1 VU / 1 iteration shape.
- **D-66:** Light thresholds in `options.thresholds`: `browser_web_vital_lcp: ['p(95)<3000']`, `http_req_failed: ['rate<0.01']`, `iteration_duration: ['p(95)<15000']`. Gives smoke a real pass/fail verdict beyond "didn't crash". Tolerances tuned for the QAbbalah GitHub Pages demo target.
- **D-67:** Output is k6 default console summary only. No `handleSummary` hook, no JSON or HTML artifact in Phase 3. Keeps Phase 3 inside ROADMAP SC #4 ("lightweight enough for demos"). Phase 4 PROF-04 owns reviewer-friendly output.

### Plan split
- **D-68:** Plan 03-01 owns the registry skeleton, simulation entrypoint, `runtime-config.ts` resolver update, Vite entry config, and `--scenario` plumbing through `perf-runner.mjs`. Plan 03-02 authors the two actual smoke journeys (`home-smoke.ts`, `blog-post-smoke.ts`) and validates the smoke profile defaults end-to-end against QAbbalah.

### Claude's discretion
- Exact internal function names inside `lib/simulations/smoke.ts` (the dispatch helper, the type of the registry entry, whether the dispatch logic is inline or a tiny helper module under `lib/scenarios/`)
- The TypeScript type for `Scenario` (a function signature accepting `{ page, selectors? }`) — Claude defines it
- The exact 2-3 component visibility assertions inside each scenario (which selectors from `lib/pages/components/*` to call) — must exercise the K6Page shim but the specific surface is open
- Wording of the "Unknown scenario" error and the available-IDs listing format (single-line vs bullet list)
- Whether thresholds live as constants in the simulation file or pulled from a shared `lib/config/k6-options.ts` helper — both acceptable as long as smoke profile constants are visible at the entry
- Internal helper names and module organization inside `lib/scenarios/` (e.g., a shared `types.ts` for the `Scenario` type vs inline)
- Test coverage shape — at minimum, a Node unit test exercising the registry lookup and the unknown-ID failure path; whether to add a smoke-validation test that imports + introspects scenario modules without invoking k6

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase and product framing
- `.planning/PROJECT.md` — vision, recruiter-facing constraints, local-first scope
- `.planning/REQUIREMENTS.md` — Phase 3 covers BUILD-03, SCEN-01, SCEN-02, SCEN-03, PROF-01
- `.planning/ROADMAP.md` §"Phase 3: Smoke Scenarios & Supported Execution" — phase goal, 4 success criteria, dependency on Phase 2
- `.planning/STATE.md` — current position; Phase 2 closed 2026-05-11
- `CLAUDE.md` — recruiter-readable + local-first constraints; tech stack pins (k6 1.5.x, Node 22.x, TS 5.9.x, Vite 5.4.x)

### Locked decisions from prior phases (carry-forward)
- `.planning/phases/01-foundation-project-shape/01-CONTEXT.md` — D-06/D-07 (command surface), D-08 (Node runner), D-10/D-11/D-12 (.env + demo target + CLI > .env > demo precedence), D-13 (fail-fast on bad real-target config), D-15 (`perf --profile smoke --env local` grammar)
- `.planning/phases/02-upstream-sync-k6-adaptation/02-CONTEXT.md` — D-36/D-37/D-38 (K6Page + selectors shim contract that scenarios consume), D-42/D-44 (the demo patch + round-trip survival that D-53 here relies on)
- `.planning/phases/01-foundation-project-shape/01-VERIFICATION.md` — Phase 1 contracts that must remain green
- `.planning/phases/02-upstream-sync-k6-adaptation/02-VERIFICATION.md` — Phase 2 contracts that must remain green
- `.planning/phases/02-upstream-sync-k6-adaptation/02-REVIEW.md` — Phase 2 code-review warnings (transforms robustness gaps). Not blocking for Phase 3, but the residual `import { BasePage } from './BasePage'` in generated POMs (noted in 02-VERIFICATION.md §Carry-Forward Concerns) WILL trip tsc/Vite once `lib/simulations/smoke.ts` imports `@pages/HomePage`. The planner MUST address either by stripping the dead import in the converter (Phase 2 follow-up) or by hand-authoring `lib/pages/BasePage.ts` as a K6Page-compatible passthrough.
- `.planning/phases/02-upstream-sync-k6-adaptation/deferred-items.md` — `.gitkeep` wipe behavior in sync + convert scripts; small fix worth folding into Plan 03-01 since smoke scenarios will exercise the wipe path during local development

### Current code surface scenarios will integrate with
- `package.json` — scripts surface (`smoke`, `perf`, `build`, `validate:build`); MUST stay backward-compatible with `npm run smoke`
- `vite.config.ts` — entry config and `@lib`, `@pages` aliases; Plan 03-01 adds `lib/simulations/smoke.ts` as an entry
- `tsconfig.json` — module + target settings; must accept the new `lib/simulations/` + `lib/scenarios/` source trees
- `lib/config/runtime-config.ts` — `DEFAULT_PROFILE='smoke'`, `DEFAULT_SCENARIO='smoke-shell'` (D-53 replaces this), `resolveEntryFile()` (D-62 rewires this), `RUNTIME_FLAG_DEFINITIONS` for `--profile`/`--scenario`/`--demo` (already wired, do NOT churn the flag surface)
- `scripts/perf-runner.mjs` — current Node runner; Plan 03-01 modifies the k6 invocation to pass `-e SCENARIO=<id>` (D-61) and read from the new dist path (D-62)
- `scripts/validate-build.mjs` — must continue to find a built artifact; the entry-file change in D-62 may require an update
- `lib/pages/base/base-page.ts` — `K6Page` class; `pageUrl`, `pageTitle`, `navigate()`, `waitForLoadState()`, `selectors` are the scenario-facing contract
- `lib/pages/base/selectors.ts` — `K6PlaywrightSelectors` shim that scenarios use for component visibility assertions (D-57)
- `lib/pages/HomePage.ts`, `lib/pages/AboutPage.ts`, `lib/pages/PostPage.ts`, `lib/pages/components/*.ts` — generated POMs that scenarios import via `@pages/<name>`
- `lib/pages-k6-patches/HomePage.k6-patch.ts` — provides `measureNavigation()` that `home-smoke` calls (D-53)
- `lib/vendor/k6-testing-wrapper.js` + `lib/vendor/k6-testing.js` — vendored `expect` for any residual `// k6-compat:` assertions in generated POMs
- `tests/unit/runtime-config.test.mjs`, `tests/unit/perf-runner.test.mjs`, `tests/unit/sync-src.test.mjs`, `tests/unit/k6page-base.test.mjs`, `tests/unit/selectors.test.mjs`, `tests/unit/convert-transforms.test.mjs`, `tests/unit/convert-patch-injection.test.mjs`, `tests/unit/convert-pages.test.mjs`, `tests/unit/convert-roundtrip.test.mjs`, `tests/integration/upst-03-roundtrip.test.mjs` — Phase 1 + 2 test contracts that MUST stay green
- `.env.example` — only `BASE_URL` defined; Phase 3 may add no new keys (smoke defaults to demo without env)

### Permanent upstream reference (demo target + POM source)
- `../easyPlaywright/playwright.config.ts` §`use.baseURL` — `https://othrondir.github.io/QAbbalah/`, locked as the demo target
- `../easyPlaywright/src/pages/HomePage.ts` — the upstream POM the smoke flow exercises (`navigation`, `profile`, `blogPosts`, `footer` components; `mainContent`, `recentPostsSection`, `masthead` locators)
- `../easyPlaywright/src/pages/PostPage.ts` — POM for `blog-post-smoke`
- `../easyPlaywright/src/pages/AboutPage.ts` — POM kept available; no scenario in v1
- `../easyPlaywright/src/pages/components/` — `NavigationComponent`, `ProfileComponent`, `BlogPostComponent`, `FooterComponent`; smoke assertions use these via the K6Page selectors shim

### Reference architecture (pattern source, NOT a blueprint to copy wholesale)
- `../ir-perf-k6/k6/simulations/frontend-performance-simulation.test.ts` — the registry-dispatch + `options` shape Plan 03-01 adapts (strip down for showcase: no SCENARIO_MODE, no capacity logic, no TOTAL_VUS distribution)
- `../ir-perf-k6/k6/scenarios/happy-path/light-golden-flow.ts` — scenario shape Plan 03-02 adapts (drop login, drop monitor, drop selectors-from-utils — use the local K6Page selectors instead)
- `../ir-perf-k6/k6/scenarios/templates/scenario-template.ts` — boilerplate hints for the easyk6 `Scenario` type
- `../ir-perf-k6/lib/utils/scenario-config-parser.ts` — the parser easyk6 explicitly does NOT adopt (D-51 picks the simpler single-map shape instead)
- `https://grafana.com/docs/k6/latest/using-k6-browser/` — k6 browser module reference; planner should consult for the canonical `options.scenarios.browser` shape and threshold names
- `https://grafana.com/docs/k6/latest/using-k6-browser/recommended-practices/` — browser executor + iterations guidance

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `K6Page` base class (`lib/pages/base/base-page.ts`) with `navigate()`, `waitForLoadState()`, `selectors`, `pageUrl`, `pageTitle` — every scenario reads through this contract
- `K6PlaywrightSelectors` shim (`lib/pages/base/selectors.ts`) with `getByText`, `getByRole`, `getByTestId` — D-57 visibility assertions use this
- `measureNavigation()` patch (`lib/pages-k6-patches/HomePage.k6-patch.ts`) — `home-smoke` default uses this
- `RUNTIME_FLAG_DEFINITIONS` + `resolveRuntimeConfig` (`lib/config/runtime-config.ts`) — `--profile`, `--scenario`, `--demo`, `--env-file` already plumbed
- `buildCli()` + commander pattern in `scripts/perf-runner.mjs` — k6 spawn wiring already done; Plan 03-01 just amends the k6 argv
- `parseDotenv` + env-file loading in `perf-runner.mjs` — `.env > demo` precedence works today
- Vendored `expect` (`lib/vendor/k6-testing-wrapper.js`) — any residual `// k6-compat:` lines in scenarios resolve through the existing `@lib/vendor/k6-testing-wrapper.js` alias

### Established Patterns
- Node ESM CLI scripts under `scripts/*.mjs` with `commander.exitOverride()` and `main().catch -> exit 1` (sync-src.mjs, convert-pages.mjs, perf-runner.mjs all follow this)
- `spawnSync(process.execPath, [scriptPath], { cwd, env, encoding: 'utf8' })` for integration tests that drive real scripts (Phase 2 `upst-03-roundtrip.test.mjs` pattern — Plan 03-02 can adapt for a smoke launch verification)
- `node --test` for unit suites; `tests/unit/*.test.mjs` for fast pure-function tests, `tests/integration/*.test.mjs` for spawned-script tests
- Vite build → `dist/` with `npm run validate:build` checking artifacts exist (Phase 1 D-08 baseline)
- Banner header convention for generated files (D-33 Phase 2); the `lib/simulations/smoke.ts` entry is HAND-AUTHORED, not generated, so it does NOT carry the "Auto-generated" banner

### Integration Points
- `package.json` scripts: `smoke` already invokes `perf-runner.mjs --profile smoke --demo`; Plan 03-01 changes how the runner resolves the entry file but the script line stays
- `vite.config.ts` entry: must add `lib/simulations/smoke.ts` (and the `@lib/scenarios` alias if not already covered by the existing `@lib`)
- `tsconfig.json` paths: confirm `@pages/*` and `@lib/*` resolve to the new `lib/scenarios/` + `lib/simulations/` trees
- `runtime-config.ts:resolveEntryFile()`: replace the current `dist/tests/${scenario}.test.js` mapping with `dist/simulations/${profile}.js` (D-62)
- `runtime-config.ts:DEFAULT_SCENARIO`: replace `'smoke-shell'` with `'home-smoke'` (D-53)

</code_context>

<specifics>
## Specific Ideas

- Default scenario MUST exercise the Phase 2 demo patch end-to-end (D-53). This is the recruiter narrative: one `npm run smoke` invocation flows through sync → convert → patch-injection → k6 browser → real demo target → measured navigation.
- The two scenarios MUST land on two distinct POMs (`HomePage` + `PostPage`) so the registry shows depth — one POM looks like overkill, two looks like a framework.
- Light thresholds are deliberate (D-66) — a smoke that always passes regardless of behavior tells a recruiter nothing.
- `lib/simulations/smoke.ts` is hand-authored AND will be the template Phase 4 copies for `lib/simulations/load.ts` and `lib/simulations/capacity.ts`. Structure it with that future copy in mind.
- ROADMAP SC #4 explicitly says smoke "stays lightweight enough for demos" — D-58 single sleep(1), D-67 console-only output, D-64 1 VU / 1 iter are all serving this.

</specifics>

<deferred>
## Deferred Ideas

### Multi-scenario selection
Comma-separated `--scenario home-smoke,blog-post-smoke` to run multiple scenarios in one k6 process (ir-perf SCENARIOS=a,b pattern). Adds VU-distribution + sequencing complexity Phase 3 doesn't need. Reconsider in Phase 4 if load/capacity examples want it.

### `SCENARIO_MODE` (fast/realistic) env toggle
ir-perf splits scenarios into fast (1s delays) vs realistic (~3s+ delays, learning phase). Useful only when scenarios run as load/capacity profiles. Phase 4 can revisit if PROF-02/PROF-03 need it.

### Custom recruiter-readable summary line
Print a one-line "Scenario `home-smoke` completed: 1 iter, X ms, LCP Y ms" at end. Belongs to Phase 4 PROF-04 (readable summary or artifact).

### Screenshot-on-error wrapping
Try/catch each scenario step, call `page.screenshot()` on throw, then rethrow. Useful for CI but adds artifact storage Phase 3 doesn't own. Phase 4 territory.

### A third `about-smoke` scenario
`AboutPage` stays generated but unused in v1 (D-56). Adding it is a 30-line follow-up if the showcase narrative needs more breadth.

### Scenario validation / "smoke the registry" test
A unit test that imports every entry in `SCENARIO_REGISTRY` and asserts it has `fn`, `description`, `pages` without invoking k6. Mostly a defensive net. Claude's discretion in this phase already — promote to a planning requirement only if Plan 03-01 doesn't include it.

### Folded Todos
No pending todos cross-referenced for Phase 3 scope.

### Reviewed Todos (not folded)
None — no todos surveyed.

</deferred>

---

*Phase: 03-smoke-scenarios-supported-execution*
*Context gathered: 2026-05-11*
