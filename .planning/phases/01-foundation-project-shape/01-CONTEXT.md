# Phase 1: Foundation & Project Shape - Context

**Gathered:** 2026-04-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish the base project shape for the new EasyK6 architecture: modern TypeScript-first structure, build foundation, config/runner surface, and legacy handling. This phase does not implement the upstream sync pipeline or the smoke journeys themselves; it prepares the repo so those later phases have a clean place to land.

</domain>

<decisions>
## Implementation Decisions

### Repository structure
- **D-01:** Phase 1 should reshape the repo directly into the target architecture instead of using a long-lived hybrid layout.
- **D-02:** Synced upstream Playwright material from `easyPlaywright` should live in `src/pages/`.
- **D-03:** The generated k6-compatible page layer should live in `lib/pages/`.
- **D-04:** Persistent k6-only overrides should live in `lib/pages-k6-patches/`.
- **D-05:** All new code introduced in Phase 1 should be TypeScript; existing JavaScript may coexist temporarily only as legacy reference.

### Command surface
- **D-06:** Public commands should stay recruiter-friendly and simple: `smoke`, `perf`, `sync:src`, and `convert-pages`.
- **D-07:** Phase 1 should create only the command skeleton needed for the next phases: `build`, `smoke`, `perf`, `sync:src`, and `convert-pages`.
- **D-08:** A Node-based runner should exist behind the command surface, with `perf` as the main advanced entry point.
- **D-09:** Public naming should prefer simple commands over highly technical script names.

### Configuration model
- **D-10:** Configuration should use `.env.example` and `.env` in the repo root as the main developer-facing convention.
- **D-11:** The demo target should remain built in around the current `QAbbalah` URL for zero-friction showcase runs.
- **D-12:** Runtime-stable values belong in `.env`; execution-time selections such as profile, scenario, and mode belong in CLI flags.
- **D-13:** Outside demo mode, invalid real-target configuration should fail fast with a clear error message rather than silently falling back.
- **D-14:** Demo mode should be explicit: `npm run smoke` should use the built-in demo target by default.
- **D-15:** Real-target execution should use the same command grammar through CLI flags, e.g. `perf --profile smoke --env local`.
- **D-16:** Configuration precedence should be `CLI > .env > built-in demo defaults`.
- **D-17:** `.env.example` should stay minimal in Phase 1 and define only `BASE_URL`.

### Legacy handling
- **D-18:** The current JavaScript starter tree should move under a legacy-oriented location such as `legacy/` or `legacy-js/`.
- **D-19:** The new TypeScript/k6 architecture should become the first thing a recruiter sees when opening the repo.
- **D-20:** Legacy material only needs a brief note in the main docs; it should not dominate the explanation.
- **D-21:** The old JavaScript code is reference material for ideas and comparisons, not a codebase to migrate line by line.

### the agent's Discretion
- Exact file names for internal helper modules, validator modules, and Vite/TS config support files
- Exact alias names and folder-level barrel exports, as long as they preserve the chosen repo shape
- Exact wording of config validation errors and help text, as long as they stay clear and recruiter-friendly

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase and product framing
- `.planning/PROJECT.md` — project vision, non-negotiables, local-first scope, and recruiter-facing goals
- `.planning/REQUIREMENTS.md` — Phase 1 requirement coverage for `BUILD-01` and `BUILD-02`
- `.planning/ROADMAP.md` — Phase 1 boundary, success criteria, and the dependency chain into later phases

### Current EasyK6 baseline
- `README.md` — current public repo narrative and starter command surface
- `PROJECT_STRUCTURE.md` — current starter repo shape that will be relegated to legacy status
- `package.json` — current script surface and runtime/tool version baseline
- `config/config.js` — current hardcoded target/config approach that Phase 1 will replace
- `pages/BasePage.js` — current JavaScript POM baseline
- `tests/smoke/basic-smoke.test.js` — current smoke test baseline

### Permanent upstream model
- `../easyPlaywright/README.md` — upstream Playwright showcase goals and public architecture
- `../easyPlaywright/package.json` — upstream TypeScript toolchain and script conventions
- `../easyPlaywright/playwright.config.ts` — current demo target and Playwright baseURL model
- `../easyPlaywright/src/pages/BasePage.ts` — upstream page-object base contract
- `../easyPlaywright/src/pages/HomePage.ts` — example composed page object shape
- `../easyPlaywright/src/pages/AboutPage.ts` — example page-specific locator shape

### Reference architecture source
- `../ir-perf-k6/README.md` — target direction for scenario/build/runner framing
- `../ir-perf-k6/package.json` — proven command surface, toolchain, and dependency layout
- `../ir-perf-k6/docs/DEVELOPMENT.md` — reference project structure and architectural layering
- `../ir-perf-k6/config/convert-to-k6.sh` — reference conversion-pipeline strategy
- `../ir-perf-k6/scripts/k6-runner.js` — reference runner UX and CLI design

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `package.json`: already pins modern runtime versions (`k6` 1.5.0, Node 22.x, npm 11.x) that are compatible with the new foundation
- `config/config.js`: contains the current demo target URL and test-profile ideas that can inform the first TypeScript config model
- `pages/*.js`: small JS POM layer that can be preserved as legacy comparison material
- `tests/smoke/basic-smoke.test.js`: useful as a historical baseline for the first smoke command story

### Established Patterns
- Current EasyK6 pattern is direct `k6 run tests/...` scripts with hardcoded config and JS page objects
- `easyPlaywright` pattern is TypeScript-first POM with relative page URLs and a central config owning the base URL
- `ir-perf-k6` pattern is explicit layering: synced source, generated k6 layer, scenarios/simulations, config, and runner scripts

### Integration Points
- Phase 1 should create the directories and toolchain that Phase 2 will use for sync into `src/pages/`
- Phase 1 should create the config and runner contract that Phase 3 smoke execution will reuse
- Legacy JS content should remain available but moved out of the primary public architecture path

</code_context>

<specifics>
## Specific Ideas

- The public repo should feel polished and understandable to recruiters, not enterprise-heavy
- `QAbbalah` should remain the zero-friction demo target in the early framework
- The repo should present a clean "new architecture first, starter legacy second" story
- The command surface should read simply in README examples: `smoke`, `perf`, `sync:src`, `convert-pages`

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation-project-shape*
*Context gathered: 2026-04-23*
