# Phase 4: Example Profiles & Output Surface - Context

**Gathered:** 2026-05-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver two example-grade k6 simulation entries (load + capacity) that reuse the Phase 3 scenario registry and runner architecture, plus a recruiter-readable output surface that every k6 run emits to `reports/`. Smoke remains the supported first-class workflow; load + capacity ship as illustrative examples clearly labeled at the npm-script, file, and README layer.

This phase delivers PROF-02 (load profile example), PROF-03 (capacity profile example), and PROF-04 (readable summary/report artifact for smoke and example profiles).

**Out of scope:**
- Full README rewrite / prose polish (Phase 5 DOCS-01/DOCS-02)
- Grafana, OTEL, or other observability platform integration (PROJECT.md "Out of Scope")
- CI/CD integration of the load + capacity examples (not a milestone deliverable)
- Distributed / cloud k6 execution (local-first constraint)
- New scenarios beyond the Phase 3 registry — load + capacity REUSE `home-smoke` (D-02). A "load-mixed" scenario would be a Phase 5+ deferred idea.
- An interactive HTML dashboard (k6 jslib HTML reporter or k6 Cloud) — explicitly rejected as too enterprise for the showcase scope per CLAUDE.md "Reference architecture" constraint.

</domain>

<decisions>
## Implementation Decisions

### Load profile shape (PROF-02)

- **D-01:** Load profile executor is `ramping-vus` with classic 3-stage shape — `[ {duration:'30s', target:5}, {duration:'60s', target:5}, {duration:'30s', target:0} ]`. ~2 minutes total, peak 5 concurrent VUs. Recruiter sees the canonical ramp/hold/ramp narrative; the shape stays local-laptop-friendly against GitHub Pages chromium memory cost (each k6 browser VU ≈ 150-250 MB).
- **D-02:** Load profile reuses the existing scenario registry via `__ENV.SCENARIO`. Default scenario for the load profile is `home-smoke` (the same recruiter-narrative journey smoke uses). Invocation pattern: `npm run example:load -- --demo` (default home-smoke), or `npm run example:load -- --scenario blog-post-smoke --demo`. No load-specific scenarios authored — the architecture's point is that profiles compose orthogonally with scenarios.
- **D-03:** Load profile thresholds **loosen Phase 3 D-66 for concurrency AND add a load-relevant `http_req_duration` signal**:
  - `browser_web_vital_lcp: ['p(95)<4000']` (raised from <3000 — concurrent chromium contexts depress LCP)
  - `http_req_failed: ['rate<0.05']` (raised from <0.01 — sub-resource flake amplifies at 5 VUs)
  - `iteration_duration: ['p(95)<25000']` (raised from <15000 — concurrent journeys take longer)
  - `http_req_duration: ['p(95)<2000']` (NEW for load — per-request p95 latency; the load-specific signal)
  Threshold values CHANGE BETWEEN PROFILES on purpose: recruiter sees the same architecture produce different pass/fail bars per profile.
- **D-04:** Load profile thresholds remain SOFT (no `abortOnFail`). A trip is captured in the summary; the run completes the full ramp. Mirrors smoke's "real verdict, not blocker" stance from D-66.

### Capacity profile shape (PROF-03)

- **D-05:** Capacity semantics are **find-the-breaking-point**, not sustain-the-target. PASS in the recruiter narrative means "we discovered the ceiling" — a threshold breach is the SIGNAL, not failure. Classic ir-perf capacity-test framing without inheriting ir-perf machinery.
- **D-06:** Capacity executor is `ramping-arrival-rate` (iterations-per-second ramp). Decouples ramp steepness from chromium spin-up cost; throughput is the X axis, which is the right shape for breaking-point discovery.
- **D-07:** Capacity ramp parameters target local-laptop demo scale:
  - `startRate: 0`, `timeUnit: '1s'`
  - `stages: [ { duration: '180s', target: 10 } ]` — 0 → 10 iterations/s over 3 minutes
  - `preAllocatedVUs: 10`, `maxVUs: 10`
  Likely trips `iteration_duration` near 8-10 iter/s against GitHub Pages — the visible breaking-point evidence. ~3 GB peak chromium RAM ceiling stays manageable on a 16 GB laptop.
- **D-08:** Capacity thresholds are SOFT (no `abortOnFail`), same metric set as load but values TUNED TO REPRESENT THE CEILING:
  - `browser_web_vital_lcp: ['p(95)<4000']`
  - `http_req_failed: ['rate<0.05']`
  - `http_req_duration: ['p(95)<3000']` (looser than load's 2000 — capacity is the ceiling)
  - `iteration_duration: ['p(95)<30000']` (looser than load's 25000)
  Full ramp completes; the report narrates which thresholds tripped at which point.

### Output surface (PROF-04)

- **D-09:** Output emits TWO artifacts per run: `reports/<profile>-<scenario>.md` (recruiter-readable Markdown) AND `reports/<profile>-<scenario>.json` (full k6 dump for tool consumption / re-processing). Markdown is the recruiter's entry point; JSON is the raw-data path.
- **D-10:** Output is emitted on EVERY k6 run — smoke, load, and capacity all produce the artifact pair. No `--report` opt-in flag (it would add a recruiter-friction step). `reports/` is already gitignored.
- **D-11:** Markdown content structure (curated narrative, NOT raw k6 stdout dump):
  - Header — profile, scenario, baseUrl, ISO run date
  - "What ran" — scenario description + profile shape (e.g., "5 VUs, 2 min ramping load")
  - Thresholds table — name | bound | actual | PASS/FAIL
  - Key metrics table — LCP p(95), iteration_duration p(95), http_req_failed rate, http_req_duration p(95) where present, browser_data_received total
  - Footer — link to the `.json` sibling for raw data
  Recruiter reads top-to-bottom in ~30 seconds. Renders cleanly when viewed on GitHub.
- **D-12:** File naming overwrites on every run: `reports/<profile>-<scenario>.md` and `reports/<profile>-<scenario>.json`. No timestamping, no per-run subdir. Last run wins. Keeps `reports/` tidy and predictable.

### Example labeling strategy (Phase 4 success criterion #4)

- **D-13:** Primary signal lives at the package.json + README layer:
  - `npm run smoke` stays as-is (supported demo path)
  - `npm run example:load` and `npm run example:capacity` are the example invocations (NEW)
  - Bare `npm run perf -- --profile load` and `npm run perf -- --profile capacity` still work — they're just not the labeled entry point
  - README quickstart includes a 3-row table (`| Command | Status | What it does |`) marking smoke as "Supported" and load/capacity as "Example". The TABLE lands in Phase 4 (contract); the surrounding README prose is Phase 5 polish.
- **D-14:** Secondary signal lives at the file level: short JSDoc banner at the top of `lib/simulations/load.ts` AND `lib/simulations/capacity.ts`:
  ```
  /**
   * EXAMPLE PROFILE — load testing shape.
   * Smoke is the supported demo path; this profile is illustrative of how
   * the same architecture (registry, runner, summary) scales beyond smoke.
   * See README §Profiles.
   */
  ```
  `lib/simulations/smoke.ts` stays unbannered — smoke is the default; only examples need the framing.
- **D-15:** README "Supported vs Example" table lives in the **Quickstart section, prominent** — directly after the project intro, before install/build steps. Recruiter sees the framing in the first 30 seconds of reading. Phase 5 owns the prose polish around the table; Phase 4 lands the table contract + the npm scripts the table references.

### Shared infrastructure (handleSummary architecture)

- **D-16:** Shared output helper lives at `lib/simulations/lib/summary.ts` and exports a factory `makeHandleSummary(profileMetadata)` returning a `handleSummary(data)` function. Each simulation file does:
  ```ts
  import { makeHandleSummary } from './lib/summary';
  export const handleSummary = makeHandleSummary({
    profile: 'smoke', // or 'load', 'capacity'
    // scenarioGetter resolves at run time from __ENV.SCENARIO
  });
  ```
  Three simulations share one implementation; markdown formatter, JSON writer, and threshold-table render live in one place. Drift between profiles is structurally impossible.

### Plan structure

- **D-17:** Phase 4 is one ROADMAP plan (04-01) per ROADMAP.md. Planner may split into waves but MUST land all of (a) `lib/simulations/lib/summary.ts` shared helper, (b) `lib/simulations/load.ts`, (c) `lib/simulations/capacity.ts`, (d) package.json `example:load` + `example:capacity` scripts, (e) README quickstart-table contract, (f) `dist/simulations/load.js` + `dist/simulations/capacity.js` validated via `npm run validate:build` updates. Smoke MUST be re-validated through the new shared summary path (smoke regression gate).

### Plan 03-02 carry-forward folded into Phase 4 scope

- **D-18:** `PHASE_ONE_SMOKE_ENTRY_FILE` constant in `lib/config/runtime-config.ts` is removed in Phase 4. Plan 03-02 retained it as a transition alias (Option A); now that Phase 4 introduces additional simulation entries (load, capacity), the cleanup is a natural fit. If `tests/unit/runtime-config.test.mjs` references the name, drop the import.
- **D-19:** Plan 03-02 carry-forward §2 (k6 1.5 runtime caveats — no global URL, no system env into `__ENV`, `exec.test.abort` for fail-fast) is **already encoded in code** via Plan 03-02 deviation commit `7d629ba`. The shared `makeHandleSummary` helper in D-16 MUST NOT use `new URL(...)` since it runs inside k6 goja. Any path manipulation uses string-level operations (consistent with Phase 3 `normalizeBaseUrl` regex normalizer).

### Claude's discretion

- Exact internal naming of the factory return signature in `lib/simulations/lib/summary.ts` (`(data) => Record<string, string>` is the k6 `handleSummary` contract; helper-internal types are Claude's call)
- Whether the markdown formatter and JSON writer live in the same module or split into `lib/simulations/lib/format-md.ts` + `lib/simulations/lib/format-json.ts` — both acceptable
- The exact Markdown table column order (D-11 lists the columns; ordering inside the table is Claude's call)
- Whether `lib/simulations/load.ts` and `lib/simulations/capacity.ts` instantiate `K6PlaywrightSelectors` inline (mirroring smoke.ts) or factor the page-setup boilerplate into a shared `lib/simulations/lib/page-setup.ts` (probably yes — same dispatch shape three times invites a helper)
- Specific test coverage shape — at minimum, Node unit tests for the markdown + JSON formatters (deterministic data in → expected string out) and a vite-build assertion that the two new entries emit. Whether to add a smoke-validation test that imports `makeHandleSummary` and verifies the contract is Claude's call.
- Whether to add a tiny `clean:reports` npm script for dev convenience — useful but not part of any acceptance criterion; leave to planner judgment.
- Whether `reports/` gets a `.gitkeep` placeholder so it's visible in the repo before any run — recruiter-readability nice-to-have. Phase 5 docs work may want this.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase and product framing
- `.planning/PROJECT.md` — vision, "Support smoke first, keep load/capacity as examples" key decision, Out-of-Scope list (Grafana, OTEL, distributed k6)
- `.planning/REQUIREMENTS.md` — PROF-02, PROF-03, PROF-04 wording; coverage matrix shows Phase 4 owns these three
- `.planning/ROADMAP.md` §"Phase 4: Example Profiles & Output Surface" — phase goal, 4 success criteria, dependency on Phase 3
- `.planning/STATE.md` — current position; Phase 3 closed 2026-05-11 with all SC observably TRUE
- `CLAUDE.md` — recruiter-readable + local-first constraints; tech stack pins (k6 1.5.x, Node 22.x, TS 5.9.x, Vite 5.4.x)

### Locked decisions from prior phases (carry-forward)
- `.planning/phases/01-foundation-project-shape/01-CONTEXT.md` — D-06/D-07 (command surface — Phase 4 ADDS `example:load`/`example:capacity` scripts without breaking `smoke`/`perf`), D-10/D-11/D-12 (.env + demo target + CLI > .env > demo precedence applies to all profiles), D-13 (fail-fast on bad real-target config)
- `.planning/phases/02-upstream-sync-k6-adaptation/02-CONTEXT.md` — D-36/D-37/D-38 (K6Page + selectors shim contract). Load + capacity reuse the same scenario registry; same POM contract holds.
- `.planning/phases/03-smoke-scenarios-supported-execution/03-CONTEXT.md` — D-51..D-67 (registry shape, scenario semantics, profile-keyed `resolveEntryFile`, `-e SCENARIO=` plumbing, D-62 dist path convention `dist/simulations/<profile>.js`, D-66 threshold values that load/capacity loosen)
- `.planning/phases/03-smoke-scenarios-supported-execution/03-02-SUMMARY.md` — 4 deviation entries (D-01..D-04 there) documenting k6 1.5 runtime caveats. The shared summary helper in this phase's D-16 MUST honor those caveats.

### Current code surface Phase 4 integrates with
- `package.json` `scripts` — `smoke` and `perf` stay backward-compatible; Phase 4 ADDS `example:load` + `example:capacity`. `build` and `validate:build` get implicit updates as new entries land
- `vite.config.ts` — `globSync('./lib/simulations/**/*.ts')` already picks up new files; no config change required for D-17 entries (a) (b) (c)
- `scripts/validate-build.mjs` `requiredFiles` — Phase 3 list is `[ 'dist/simulations/smoke.js', 'scripts/perf-runner.mjs', '.env.example', 'lib/config/runtime-config.ts' ]`. Plan 03-02 deleted the Phase 1 shell entry. Phase 4 ADDS `'dist/simulations/load.js'` + `'dist/simulations/capacity.js'`. Question for planner: should validate-build require ALL artifacts (strict) or only smoke (lenient — examples ARE optional artifacts)? Recommend strict — every npm entry must produce a build output.
- `lib/config/runtime-config.ts` — `resolveEntryFile(profile)` is already profile-keyed (`dist/simulations/${profile}.js`). Phase 4 needs NO change here beyond removing `PHASE_ONE_SMOKE_ENTRY_FILE` per D-18.
- `lib/simulations/smoke.ts` — REFERENCE shape for the new load.ts + capacity.ts files. Plan 03-02 deviation commit added `exec.test.abort` usage for SCEN-03 fail-fast; load + capacity reuse the registry → reuse the same fail-fast path.
- `lib/scenarios/index.ts`, `lib/scenarios/home-smoke.ts`, `lib/scenarios/blog-post-smoke.ts` — Phase 3 scenario registry stays untouched. Phase 4 profiles consume it identically to smoke.
- `scripts/perf-runner.mjs` — `buildK6Args` already passes all four `-e` flags (BASE_URL, K6_PROFILE, K6_SCENARIO, K6_DEMO). Phase 4 needs NO runner code change.
- `tests/unit/runtime-config.test.mjs`, `tests/unit/perf-runner.test.mjs`, `tests/unit/scenarios-registry.test.mjs` — Phase 1-3 tests MUST stay green. Adding new entries should not break the existing assertions.
- `.gitignore` — `reports/` line 37 already present. PROF-04 artifacts land in a pre-gitignored directory.

### Permanent upstream reference (demo target + POM source)
- `https://othrondir.github.io/QAbbalah/` — the demo target locked in Phase 1 D-10. Load + capacity hit the same URL via `BASE_URL`/`--demo` path. GitHub Pages cold-cache variance affects all three profiles (Plan 03-02 SUMMARY §"Note on LCP=0s" documents this).
- `../easyPlaywright/playwright.config.ts` §`use.baseURL` — confirms demo URL alignment

### k6 reference (relevant to Phase 4 specifically)
- `https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/ramping-vus/` — D-01 load executor reference
- `https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/ramping-arrival-rate/` — D-06 capacity executor reference, including `preAllocatedVUs` semantics
- `https://grafana.com/docs/k6/latest/using-k6/k6-options/reference/thresholds/` — threshold options, `abortOnFail` flag (set to false / omitted for soft thresholds per D-04, D-08)
- `https://grafana.com/docs/k6/latest/results-output/end-of-test/custom-summary/` — `handleSummary` contract (signature, return-value shape, multi-output)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`lib/simulations/smoke.ts`** (96 lines) — direct shape reference for `load.ts` + `capacity.ts`. The `await page.goto(runtimeConfig.baseUrl)` Q3-landmine fix from Phase 3 D-A7 MUST be replicated in both new entries (HomePage.pageUrl='' so K6Page.navigate() guard short-circuits without the explicit goto).
- **`lib/scenarios/index.ts`** — `SCENARIO_REGISTRY` consumed unchanged by all three profiles. Registry's `home-smoke` entry is the default landing scenario for load + capacity per D-02.
- **`scripts/perf-runner.mjs::buildK6Args`** — already passes the four `-e` flags. No runner changes needed.
- **`lib/config/runtime-config.ts::resolveEntryFile`** — already profile-keyed. Adding `load` + `capacity` profiles requires NO config-resolver change (the resolver is `dist/simulations/${profile}.js` per Phase 3 D-62).
- **`vite.config.ts`** glob — `./lib/simulations/**/*.ts` picks up new files automatically.
- **k6 `exec.test.abort` from `k6/execution`** — already wired by Plan 03-02 deviation commit `7d629ba`. Available for any new fail-fast path in load/capacity simulations.

### Established Patterns
- **Profile-keyed dist mapping (D-62 / Phase 3)** — every new profile = one new file under `lib/simulations/<profile>.ts`. No runner-side dispatch logic. Phase 4 honors this verbatim.
- **Scenario-agnostic profile architecture (D-02 here, D-60..D-62 / Phase 3)** — profiles compose orthogonally with scenarios. Load + capacity REUSE the registry; they don't fork it.
- **Soft thresholds with real values (D-66 / Phase 3)** — smoke pioneered "tolerances loose-but-real, give a verdict beyond didn't-crash". Load (D-03) and capacity (D-08) inherit the philosophy with relaxed values.
- **Plan 03-02 deviation pattern** — runtime defects in k6 1.5 goja (no global URL, no system env into __ENV) are mitigated at the source. The new `lib/simulations/lib/summary.ts` MUST honor these caveats; specifically, no `new URL(...)`, no reliance on `process.env`.

### Integration Points
- `package.json` scripts surface — new `example:load` + `example:capacity` entries
- `scripts/validate-build.mjs::requiredFiles` — add `dist/simulations/load.js` + `dist/simulations/capacity.js`
- README quickstart section — Supported vs Example table contract (Phase 4 lands it; Phase 5 polishes prose)
- `lib/simulations/lib/summary.ts` — NEW shared helper file consumed by smoke.ts (modified) + load.ts (new) + capacity.ts (new)

### Creative Options
- The shared `makeHandleSummary` factory could expose hook points for profile-specific markdown sections (e.g., capacity could append a "Ceiling discovered at iter/s = X" narrative line). Worth considering during planning — costs ~20 lines, adds capacity-narrative value.
- `lib/simulations/lib/` is a NEW subdir convention; future Phase 4+ simulations get a natural home for shared helpers (page-setup, custom-metrics, etc.). Mirrors `lib/pages/base/` for K6Page infrastructure.

</code_context>

<specifics>
## Specific Ideas

- The "ramp/hold/ramp" three-stage shape for load (D-01) was deliberately chosen to match the canonical recruiter mental model of a load test, NOT because it's the most useful real-world shape. The showcase value is recognition.
- The 0→10 iter/s capacity ramp (D-07) is calibrated to actually trip thresholds against GitHub Pages — if it didn't trip, "find-the-breaking-point" loses meaning. The planner should validate this empirically during execution, with willingness to bump the peak rate or duration if 10 iter/s holds clean (which would be a surprising GitHub Pages CDN result).
- The Markdown summary (D-11) follows the same "curated, not raw" philosophy as Phase 3's recruiter-narrative scenarios. Raw k6 stdout is preserved in the `.json` artifact for anyone who wants it.
- The `example:` npm script prefix (D-13) is the strongest single recruiter-facing signal; it's the first thing visible in package.json when a recruiter inspects the project. The README table reinforces it.

</specifics>

<deferred>
## Deferred Ideas

- **Load-mixed scenario** — randomized home/post page selection per iteration (legacy-js load-test.js pattern). Adds load-specific scenario complexity but D-02 chose reuse over new scenarios. If Phase 5+ adds more scenarios, a `load-mixed` registry entry could land alongside.
- **k6 jslib HTML reporter** — fancier visualization, but pulls in jslib dependency and pushes toward "enterprise" framing. Phase 5+ idea if recruiter feedback says markdown isn't visual enough.
- **Per-run timestamped reports** — full history under `reports/<timestamp>/`. Decided against in D-12 for showcase tidyness. Phase 5+ doc-polish work could revisit if recruiters want a "history of runs" narrative.
- **Two-phase capacity (ramp + sustain near ceiling)** — combines breaking-point and sustain-the-target narratives. Decided against in D-05; revisit if Phase 5+ wants capacity to be the most-detailed example.
- **--report opt-in flag** — opt-in reports/ output. Decided against in D-10 because recruiter-friction outweighs dev tidiness. Future deferred idea: a `--no-report` flag for dev cycles, with reports defaulting ON.
- **clean:reports npm script** — convenience for dev cycles. Out of scope for Phase 4 (no acceptance criterion); planner may add if it's trivial.
- **Grafana / OTEL export** — explicitly Out of Scope in PROJECT.md. Future milestone consideration.

### Reviewed Todos (not folded)
None — no pending todos surfaced in cross-reference for Phase 4.

</deferred>

---

*Phase: 04-example-profiles-output-surface*
*Context gathered: 2026-05-11*
