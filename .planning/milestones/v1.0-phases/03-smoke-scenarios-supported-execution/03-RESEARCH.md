# Phase 3: Smoke Scenarios & Supported Execution - Research

**Researched:** 2026-05-11
**Domain:** k6 browser smoke execution, scenario registry, simulation entrypoint wiring
**Confidence:** HIGH

This research operates entirely inside locked decisions D-51..D-68 from `03-CONTEXT.md`. It investigates HOW to implement those decisions well — it does not re-litigate them. Every claim below is tagged with provenance: `[VERIFIED]` (confirmed via tool/grep), `[CITED]` (from official docs), `[ASSUMED]` (training knowledge).

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BUILD-03 | Developer can launch the primary smoke simulation locally through one documented command | §File-by-file Touch Map (Plan 03-01 wires `npm run smoke` -> `dist/simulations/smoke.js`); §k6 Browser Module Details (entrypoint shape) |
| SCEN-01 | Repo exposes a central registry of named scenarios instead of only one-off test files | §Scenario Authoring Pattern (registry TS shape, single map at `lib/scenarios/index.ts`) |
| SCEN-02 | Smoke scenarios run simple browser performance journeys against the demo target using reused upstream page objects | §Scenario Authoring Pattern (`home-smoke`, `blog-post-smoke` exercising `HomePage`/`PostPage` + components) |
| SCEN-03 | Scenario selection is configurable through CLI or environment without code edits | §k6 Browser Module Details (`__ENV.SCENARIO` plumbing via `-e SCENARIO=<id>`); §File-by-file Touch Map (`perf-runner.mjs` k6 argv change) |
| PROF-01 | Smoke is the default supported profile with deterministic low-resource settings suitable for demos | §k6 Browser Module Details (1 VU / 1 iter, shared-iterations executor, light thresholds) |

---

## 1. Summary

- **Smoke entrypoint shape is settled.** Single hand-authored `lib/simulations/smoke.ts` exports `options` (1 VU / 1 iter / `shared-iterations` + browser-type / 3 thresholds) and a default async function that reads `__ENV.SCENARIO` and dispatches via `SCENARIO_REGISTRY[id].fn({ page, selectors })`. This matches D-60..D-66 and adapts the ir-perf shape with all enterprise weight stripped.

- **The BasePage dangling-import problem is real and will break Plan 03-01 at the Vite build step.** All three top-level POMs (`HomePage.ts`, `AboutPage.ts`, `PostPage.ts`) carry a residual `import { BasePage } from './BasePage';` that has no resolution target (BasePage is in `SKIP_FILES`). Recommendation: **fix at the converter** (add a "strip self-referential BasePage import" rule in `scripts/lib/transforms.mjs`) AND author `lib/pages/BasePage.ts` as a one-line `K6Page` re-export to defend against any future upstream POMs the strip rule misses. The converter fix is the durable answer; the passthrough is a belt-and-suspenders safety net. Evidence in §3.

- **k6 1.5.x thresholds for the smoke profile are well-supported.** `browser_web_vital_lcp` is canonical [CITED: grafana.com/docs/k6 browser metrics]; `http_req_failed` and `iteration_duration` are k6 standard metrics [CITED: grafana.com/docs/k6 thresholds]. The decision D-66 values (`p(95)<3000`, `rate<0.01`, `p(95)<15000`) are conservative for a GitHub-Pages-hosted Jekyll demo and unlikely to false-positive.

- **`__ENV.SCENARIO` plumbing is k6-native and idiomatic.** `k6 run -e SCENARIO=<id> dist/simulations/smoke.js` exposes the value as `__ENV.SCENARIO` inside the script. No rebuild required when the scenario changes — recruiters can swap scenarios at the CLI without invoking Vite. The existing `perf-runner.mjs` already injects `K6_SCENARIO` into the k6 process env; adding `-e SCENARIO=...` to the argv is a 2-line change.

- **`runtime-config.ts:resolveEntryFile()` has exactly one call site to update.** The function is called only inside `resolveRuntimeConfig` (line 112) and assigned to `entryFile`. Downstream readers are `perf-runner.mjs:printDryRun` and `runK6` (both consume `runtimeConfig.entryFile` opaquely) plus the existing `runtime-config.test.mjs` (asserts `PHASE_ONE_SMOKE_ENTRY_FILE`). The constant rename and resolver rewrite is mechanical — see §4.

- **The `.gitkeep`-wipe behavior WILL trip during Phase 3 smoke runs.** Plan 02-03's `convert-pages.mjs:emptyLibPagesExceptBase` (lines 94-103) and `sync-src.mjs` both wipe `.gitkeep` markers. With the new `.gitignore` rules from commit 9ce879f keeping the markers tracked, every real round-trip produces `D src/pages/.gitkeep` + `D lib/pages/.gitkeep` in `git status` — recruiter-visible noise. The fix is 4 lines total (skip `.gitkeep` in both `emptyDir` and `emptyLibPagesExceptBase`) and is documented in `02-deferred-items.md §3`. Plan 03-01 should fold this in alongside the BasePage strip rule.

- **Vite entry config needs additive change only.** Current `vite.config.ts` discovers `./k6/simulations/**/*.test.ts` via `globSync` and maps them to `dist/tests/<rel>.js`. Plan 03-01 adds a second glob for `./lib/simulations/**/*.ts` that maps to `dist/simulations/<rel>.js`. Phase 1's `dist/tests/smoke/smoke-shell.test.js` continues to build (no breakage), and `validate-build.mjs` keeps passing by checking either-or the new path during the transition wave.

- **`npm run smoke` line stays byte-identical.** `node scripts/perf-runner.mjs --profile smoke --demo`. All Phase 3 changes are behind the runner — the user-facing command surface is untouched. This is a non-negotiable recruiter narrative invariant (D-68 splits assume it).

- **Scenario `fn` signature should be `({ page, selectors }) => Promise<void>`** where `selectors` is a fresh `K6PlaywrightSelectors` instance the entrypoint constructs once per iteration. Each scenario instantiates its own POMs via `new HomePage(page)`. Keeps scenarios short and recruiter-readable; no monitor/screenshot/api-client noise from ir-perf.

- **Registry-shape unit test is high-value and cheap.** A pure Node `node --test` suite under `tests/unit/scenarios-registry.test.mjs` that imports `lib/scenarios/index.ts` via the same `ts.transpileModule` + data-URL pattern Phase 2 uses, then asserts: (a) `home-smoke` and `blog-post-smoke` keys present, (b) each entry has `fn`, `description`, `pages`, (c) lookup of an unknown ID returns `undefined`. ~40 lines. Catches registry shape regressions without spinning up k6.

**Primary recommendation:** Plan 03-01 fixes the BasePage import at the converter, adds the `.gitkeep` skip, wires the new entry in Vite, replaces `resolveEntryFile()`, plumbs `-e SCENARIO`, and lands the registry skeleton + dispatch. Plan 03-02 authors the two scenarios, ships `.env.example` unchanged (no new keys), and validates end-to-end against QAbbalah.

---

## 2. k6 Browser Module Details

### 2.1 `options` shape for the smoke profile (D-63, D-65, D-66)

Canonical k6 1.5.x browser options shape [CITED: grafana.com/docs/k6/latest/using-k6-browser/running-browser-tests/]:

```ts
export const options = {
  scenarios: {
    browser: {                          // scenario name (k6-internal, not the easyk6 scenario id)
      executor: 'shared-iterations',
      vus: 1,                           // D-64
      iterations: 1,                    // D-64
      options: {
        browser: {
          type: 'chromium',
        },
      },
    },
  },
  thresholds: {
    browser_web_vital_lcp: ['p(95)<3000'],   // D-66
    http_req_failed: ['rate<0.01'],          // D-66
    iteration_duration: ['p(95)<15000'],     // D-66
  },
};
```

**Note on the scenario-key name:** The k6 scenario key (`browser:` above) is NOT the easyk6 scenario id (`home-smoke`). The k6 key names a k6-internal executor instance; the easyk6 scenario id comes from `__ENV.SCENARIO` and selects which `registry.fn` runs INSIDE the default exported function. Calling the k6 scenario key `browser` (or `smoke`) keeps the recruiter-facing simulation file readable.

[VERIFIED via Phase 1 `k6/simulations/smoke/smoke-shell.test.ts:7-18`] The existing Phase 1 shell already uses the exact `shared-iterations` + `vus: 1` + `iterations: 1` + `options.browser.type: 'chromium'` shape — Plan 03-01 keeps this and adds the thresholds block + dispatch body.

### 2.2 Threshold metric names (D-66)

[CITED: grafana.com/docs/k6/latest/using-k6-browser/metrics/] Canonical browser web-vital metric names in k6 1.5.x:

| Metric | Canonical Name | Notes |
|--------|---------------|-------|
| LCP (Largest Contentful Paint) | `browser_web_vital_lcp` | Used in D-66 |
| FCP (First Contentful Paint) | `browser_web_vital_fcp` | Not used in smoke; available for Phase 4 |
| CLS (Cumulative Layout Shift) | `browser_web_vital_cls` | Layout stability; consider for Phase 4 |
| INP (Interaction to Next Paint) | `browser_web_vital_inp` | Replaces FID in modern web vitals |
| TTFB (Time to First Byte) | `browser_web_vital_ttfb` | Server response timing |

[CITED via web fetch above] FID (First Input Delay) is NOT collected by the k6 browser module — INP replaced it.

[ASSUMED] `http_req_failed` is a k6 standard counter metric that emits `rate` over the test run; threshold `rate<0.01` means <1% failed HTTP requests. `iteration_duration` is a standard trend metric measured in ms. Both are universal k6 metrics, not browser-module-specific. Confidence is HIGH because both have been stable since k6 0.x and are documented across multiple Grafana k6 reference pages.

**Threshold units:**
- `browser_web_vital_lcp`: milliseconds. `p(95)<3000` = 95th percentile under 3s. Sane for a Jekyll/GitHub-Pages static site (typical LCP 800-1500ms on cold cache).
- `http_req_failed`: rate (0.0-1.0). `rate<0.01` = under 1% failures.
- `iteration_duration`: milliseconds. `p(95)<15000` = 95th percentile under 15s for the full home-smoke or blog-post-smoke flow (navigate + 2-3 visibility waits + `sleep(1)` pacing).

[ASSUMED] These tolerances should hold on a typical developer laptop running against the QAbbalah GitHub Pages target with default Chromium. Real-world variance on GitHub Pages cold cache can push LCP toward 2000-2500ms — `p(95)<3000` gives ~500ms headroom. If smoke flakes during Plan 03-02 validation, raising LCP to `p(95)<4000` is the right loosener; do NOT loosen `iteration_duration` past 20s (recruiter perception threshold).

### 2.3 `__ENV.SCENARIO` plumbing (D-60, D-61, SCEN-03)

[CITED: grafana.com/docs/k6/latest/using-k6/environment-variables/] k6's `-e KEY=VALUE` flag exposes the variable at runtime via `__ENV.KEY` inside the script. The variable is read at module-init time AND at runtime (no rebuild needed; the value is injected by k6 itself).

Inside `lib/simulations/smoke.ts`:
```ts
declare const __ENV: Record<string, string | undefined>;

const scenarioId = __ENV.SCENARIO ?? 'home-smoke';   // D-53 default
const entry = SCENARIO_REGISTRY[scenarioId];
if (!entry) {
  throw new Error(
    `Unknown scenario '${scenarioId}'. Available: ${Object.keys(SCENARIO_REGISTRY).join(', ')}`
  );  // D-55 — fail-fast with available IDs listing
}
```

**Where the unknown-scenario check fires:** Two options, both acceptable.

| Option | Trade-off | Recommendation |
|--------|-----------|----------------|
| Check at the **runner** (perf-runner.mjs validates `--scenario` against a known list before spawning k6) | Earliest failure, no k6 spin-up cost. Requires perf-runner to know the registry. | Adds coupling: perf-runner.mjs is `.mjs` and would need to read `lib/scenarios/index.ts`. Avoid this coupling. |
| Check at the **simulation** (k6 throws on unknown `__ENV.SCENARIO`) | k6 starts, browser launches, then throws. Slower but registry stays in one TypeScript module. | **Recommended.** Failure shows up in k6 console output, which is recruiter-readable. Cost: ~1-2s of k6 startup before the throw. |

[ASSUMED] Throwing from the default exported function before any browser action will produce a clean k6 failure with the error message in `stderr`. The k6 process exits non-zero (correct behavior for D-55 fail-fast).

### 2.4 Executor semantics

[CITED: grafana.com/docs/k6/latest/using-k6/scenarios/executors/shared-iterations/] `shared-iterations` executor:
- VUs share a fixed pool of iterations.
- With `vus: 1, iterations: 1`, the single VU consumes the single iteration — exactly one full journey.
- `maxDuration` defaults to `10m`; for smoke this is plenty.

[ASSUMED] The `options.browser.type: 'chromium'` field inside the scenario block tells the k6 browser module to launch Chromium for VUs in that scenario. This is required — without it the `browser` import returns null and `browser.newPage()` throws. Phase 1's `smoke-shell.test.ts` already uses this shape.

---

## 3. Carry-Forward Concerns from Phase 2

### 3.1 Dangling `import { BasePage } from './BasePage';`

[VERIFIED via grep `from './BasePage'` in `lib/pages/`]
```
lib\pages\AboutPage.ts:7:import { BasePage } from './BasePage';
lib\pages\PostPage.ts:7:import { BasePage } from './BasePage';
lib\pages\HomePage.ts:8:import { BasePage } from './BasePage';
```

[VERIFIED via grep `BasePage` in `src/pages/HomePage.ts:2`] The upstream POM has `import { BasePage } from './BasePage';`. The converter's R5 rule (`ensureExtendsK6Page`, `scripts/lib/transforms.mjs:131-144`) rewrites `class X extends BasePage` to `class X extends K6Page`, but the IMPORT statement is untouched. `stripPlaywrightImports` (line 77-85) only matches `from '@playwright/test'` — the `from './BasePage'` line slips through. `stripDuplicateK6Imports` (line 88-101) only recognizes a fixed set of k6-specific specifiers. Result: dangling import survives.

[VERIFIED via grep] `lib/pages/BasePage.ts` does NOT exist. `BasePage.ts` is hardcoded in `scripts/convert-pages.mjs:55` `SKIP_FILES` set:
```js
const SKIP_FILES = new Set(['BasePage.ts', 'index.ts']);
```

**Impact on Phase 3:** Today the dangling import passes `ts.transpileModule` because that's syntax-only. Phase 3 plans:
1. Plan 03-01's `lib/simulations/smoke.ts` imports `@pages/HomePage`.
2. Vite resolves `@pages/HomePage` -> `lib/pages/HomePage.ts`.
3. HomePage.ts has `import { BasePage } from './BasePage';`.
4. Vite tries to resolve `./BasePage` against `lib/pages/BasePage.ts`. File missing. **Build fails: `Could not resolve "./BasePage"`.**

Same failure path for AboutPage and PostPage when they're transitively pulled in.

### 3.2 Recommendation: do both (a) and (b) — converter fix + passthrough

| Approach | Description | Pros | Cons |
|----------|-------------|------|------|
| **(a) Strip in converter** | Add a transform rule in `scripts/lib/transforms.mjs` that strips any `import\s+\{\s*BasePage\s*\}\s+from\s+['"]\./?BasePage['"];?` line | Permanent fix; future round-trips emit clean output; recruiter-visible POMs have no dead imports | Requires the converter unit suite to add a test; round-trip integration test in `tests/integration/upst-03-roundtrip.test.mjs` may need its byte-equality fixture refreshed |
| **(b) Hand-author `lib/pages/BasePage.ts` as K6Page passthrough** | A 3-line file: `export { K6Page as BasePage } from './base/base-page';` | Cheap; any unknown future POM that imports BasePage keeps working | Generated POMs still LOOK like they have a dead import (recruiter narrative: "why is this here?"); requires adding `BasePage.ts` to `convert-pages.mjs:emptyLibPagesExceptBase` skip list |
| **(c) Both** | (a) + (b) | Belt-and-suspenders; (a) cleans the recruiter-facing output, (b) defends against converter regressions or future upstream POMs that import BasePage in unusual ways (e.g., multi-line imports — see Phase 2 WR-01) | Marginal extra effort; ~15 lines total across two files |

**Recommended: (c).** Justification:
1. The converter fix (a) is the durable answer — recruiter-visible generated code should be clean.
2. The passthrough (b) costs 3 lines of code and 1 line in the SKIP list. It defends against (a) failing to match an edge case (multi-line import, comment-wrapped import) AND against any future hand-written POM in `lib/pages/` that happens to extend BasePage.
3. (b) is also useful as a recruiter-narrative hook: "we kept BasePage as a re-export so the upstream POM identity stays observable, while the runtime contract is K6Page." This is the kind of architectural restraint that distinguishes the project from a copy-paste port.

**Implementation specifics:**

For (a) — add a new transform `stripLocalBasePageImports` to `scripts/lib/transforms.mjs`, placed in the pipeline AFTER `stripPlaywrightImports` (so single-line `@playwright/test` imports go first), BEFORE `ensureExtendsK6Page`:
```js
export function stripLocalBasePageImports(content) {
  return content
    .split(/\r?\n/)
    .filter((line) =>
      !/^\s*import\s+\{\s*BasePage\s*\}\s+from\s+['"]\.\/?BasePage['"];?\s*$/.test(line)
    )
    .join('\n');
}
```
Wire into `scripts/convert-pages.mjs:convertFile` after `stripDuplicateK6Imports`. Add 2 tests to `tests/unit/convert-transforms.test.mjs`: (i) single-line import is stripped, (ii) unrelated import lines untouched. Re-run the round-trip test — byte length will change once; commit the new fixture.

For (b) — hand-author `lib/pages/BasePage.ts`:
```ts
/**
 * BasePage — re-export shim.
 *
 * Upstream easyPlaywright POMs `import { BasePage } from './BasePage'`. The
 * converter strips this import in the common case, but a passthrough is kept
 * here as a defensive net for edge-case imports (multi-line, comment-wrapped,
 * future POM variants).
 *
 * Runtime contract: BasePage IS K6Page. They are the same class behind the
 * re-export. New code should import K6Page directly from `./base/base-page`.
 */
export { K6Page as BasePage } from './base/base-page';
```
Add `'BasePage.ts'` to the preserve list. Update `scripts/convert-pages.mjs:emptyLibPagesExceptBase` to also skip `'BasePage.ts'`:
```js
async function emptyLibPagesExceptBase() {
  await fs.mkdir(TARGET_DIR, { recursive: true });
  const entries = await fs.readdir(TARGET_DIR, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === 'base' || e.name === 'BasePage.ts') continue;  // ADDED
    await fs.rm(path.join(TARGET_DIR, e.name), { recursive: true, force: true });
  }
}
```
Update the existing test `convert-pages.test.mjs:"preserves lib/pages/base/ during wipe"` (or add a new assertion) to also assert `lib/pages/BasePage.ts` survives.

### 3.3 `.gitkeep` wipe (Phase 2 `02-deferred-items.md §3`)

[VERIFIED via Phase 2 deferred-items.md] Both `scripts/sync-src.mjs:emptyDir` (lines 102-105) and `scripts/convert-pages.mjs:emptyLibPagesExceptBase` (lines 94-103) blanket-rm everything under the target. With the `.gitignore` rules from commit 9ce879f keeping `.gitkeep` tracked, every smoke development cycle produces `D lib/pages/.gitkeep` + `D src/pages/.gitkeep` in `git status`.

**Recommendation:** Fold the 4-line fix into Plan 03-01 (alongside the BasePage strip rule, since both are converter hygiene). In `convert-pages.mjs:emptyLibPagesExceptBase`, add `if (e.name === '.gitkeep') continue;`. In `sync-src.mjs:emptyDir`, do the same. Add one regression test per script.

### 3.4 Other Phase 2 warnings (WR-01..WR-05)

Per `02-VERIFICATION.md:Carry-Forward Concerns`, none of WR-01..WR-05 are blocking for Phase 3. They become relevant only if the upstream `easyPlaywright` repo changes shape (multi-line imports, multi-statement lines, reordered imports, helper classes, etc.). Plan 03-01 does NOT need to address them. Document them in a Plan 03 risks section so the planner can note "if upstream reformats, expect a converter regression — see Phase 2 WR-01..WR-05."

---

## 4. File-by-file Touch Map

D-68 splits Plan 03-01 (registry skeleton + simulation entry + runner plumbing + Phase 2 hygiene) from Plan 03-02 (scenario authoring + end-to-end validation). The map below honors that split.

### Plan 03-01: Foundation

| File | Action | Detail |
|------|--------|--------|
| **NEW** `lib/scenarios/index.ts` | CREATE | Exports `SCENARIO_REGISTRY: Record<string, Scenario>` (initially with `home-smoke` placeholder calling a stub `fn`). Also exports the `Scenario` type. Plan 03-02 fills in real `fn` bodies. |
| **NEW** `lib/scenarios/types.ts` | CREATE (optional, per D-49 Claude's discretion) | Holds the `Scenario` type if extracted from `index.ts`. Recommendation: keep inline in `index.ts` until a second consumer appears. |
| **NEW** `lib/simulations/smoke.ts` | CREATE | Hand-authored. Exports `options` (1 VU / 1 iter / shared-iterations / browser type / 3 thresholds) and default async function that reads `__ENV.SCENARIO`, dispatches via registry, fails-fast on unknown. |
| **NEW** `lib/pages/BasePage.ts` | CREATE | 3-line re-export passthrough (see §3.2(b)). |
| `lib/config/runtime-config.ts` | MODIFY | (1) Replace `DEFAULT_SCENARIO = 'smoke-shell'` -> `'home-smoke'` (D-53). (2) Rename `PHASE_ONE_SMOKE_ENTRY_FILE` -> `SMOKE_ENTRY_FILE = 'dist/simulations/smoke.js'`. (3) Rewrite `resolveEntryFile(scenario)` -> `resolveEntryFile(profile: string)`: returns `dist/simulations/${profile}.js`. (4) Update the call site in `resolveRuntimeConfig` line 112 to pass `profile` instead of `scenario`. |
| `tests/unit/runtime-config.test.mjs` | MODIFY | Update the 1st test's `entryFile` assertion to expect the new `dist/simulations/smoke.js` (or import the renamed constant). The other 4 tests are unaffected. |
| `tests/unit/perf-runner.test.mjs` | MODIFY | Update the 1st test's regex from `/k6 run dist\/tests\/smoke\/smoke-shell\.test\.js/` to `/k6 run dist\/simulations\/smoke\.js/`. The 2nd test is unaffected. |
| `scripts/perf-runner.mjs` | MODIFY | Modify `runK6` spawn argv: change `['run', runtimeConfig.entryFile]` to `['run', '-e', `SCENARIO=${runtimeConfig.scenario}`, runtimeConfig.entryFile]` (D-61). Update `printDryRun` to also print the `-e SCENARIO=...` flag so dry-runs are faithful. |
| `scripts/validate-build.mjs` | MODIFY | Add `'dist/simulations/smoke.js'` to `requiredFiles`. Keep `'dist/tests/smoke/smoke-shell.test.js'` for the transition wave (remove in a Plan 03-02 cleanup wave, or right before Phase 3 verify). |
| `vite.config.ts` | MODIFY | Add a second glob `globSync('./lib/simulations/**/*.ts')` that maps to entries `simulations/<name>` -> `lib/simulations/<name>.ts`. The existing `tests/...` entries continue to build (keeps Phase 1 contract green). Add `@scenarios` alias optional — `@lib/scenarios` already resolves. |
| `scripts/lib/transforms.mjs` | MODIFY | Add `stripLocalBasePageImports` (§3.2). Wire into pipeline in `convert-pages.mjs` after `stripDuplicateK6Imports`, before `ensureExtendsK6Page`. |
| `scripts/convert-pages.mjs` | MODIFY | (1) Add `stripLocalBasePageImports` to the imports list and pipeline. (2) Update `emptyLibPagesExceptBase` to skip `BasePage.ts` AND `.gitkeep` (§3.2(b), §3.3). |
| `scripts/sync-src.mjs` | MODIFY | Update `emptyDir` to skip `.gitkeep` (§3.3). |
| `tests/unit/convert-transforms.test.mjs` | MODIFY | Add 2 tests for `stripLocalBasePageImports`: positive strip + negative no-op on unrelated imports. |
| `tests/unit/convert-pages.test.mjs` | MODIFY | Update wipe-preserve assertion to expect `BasePage.ts` survives. Add new test asserting `.gitkeep` survives a wipe cycle. |
| `tests/unit/sync-src.test.mjs` | MODIFY | Add a test asserting sync preserves `src/pages/.gitkeep`. |
| `tests/integration/upst-03-roundtrip.test.mjs` | MODIFY | Re-run after converter changes — byte-length fixture will change once (dangling import gone). Update the asserted length OR (better) replace byte-equality with content-equality of two consecutive runs (the actual UPST-03 invariant). |
| **NEW** `tests/unit/scenarios-registry.test.mjs` | CREATE | Per D-56 (Claude's discretion + Specifics + Deferred Ideas "Scenario validation / smoke the registry test"). Loads `lib/scenarios/index.ts` via the `ts.transpileModule` + data-URL pattern (see §5.4). Asserts: registry has expected keys, each entry has `fn`/`description`/`pages`, unknown lookup is `undefined`. ~50 lines. |
| `lib/pages-k6-patches/HomePage.k6-patch.ts` | NO CHANGE | Patch is consumed during convert; smoke uses `measureNavigation()` via the patched HomePage. |
| `.env.example` | NO CHANGE | No new env keys (D-58 — no SCENARIO_MODE). |
| `package.json` scripts | NO CHANGE | `smoke` / `perf` lines stay byte-identical. `build` / `validate:build` unchanged. |
| `README.md`, `PROJECT_STRUCTURE.md` | NO CHANGE in 03-01 | Doc updates land in Phase 5 (DOCS-01/02). |

**Removable post-transition (consider in Plan 03-02 cleanup wave):**
- `k6/simulations/smoke/smoke-shell.test.ts` — the Phase 1 shell. Once `dist/simulations/smoke.js` is the canonical entry, the shell is redundant. Keep through Plan 03-01 to preserve Phase 1 build contract; remove in 03-02 (or document the removal in 03-02 SUMMARY).
- `PHASE_ONE_SMOKE_ENTRY_FILE` const — rename in 03-01, delete the old name in 03-02 cleanup.

### Plan 03-02: Scenario authoring + validation

| File | Action | Detail |
|------|--------|--------|
| **NEW** `lib/scenarios/home-smoke.ts` | CREATE | Implements the `home-smoke` `fn`. Imports `HomePage` from `@pages/HomePage`, instantiates, calls `measureNavigation()`, then runs 2-3 visibility assertions via the K6Page selectors shim (D-57). Single `sleep(1)` between major steps (D-58). |
| **NEW** `lib/scenarios/blog-post-smoke.ts` | CREATE | Implements the `blog-post-smoke` `fn`. Imports `HomePage` and `PostPage` from `@pages/*`. Flow: home navigate -> visibility check -> navigate to a post (use `homePage.navigateToPost(<title>)` OR `postPage.navigateToPost('hello-world')`) -> post visibility check. |
| `lib/scenarios/index.ts` | MODIFY | Replace placeholder fn entries with real imports from `home-smoke.ts` and `blog-post-smoke.ts`. |
| `tests/unit/scenarios-registry.test.mjs` | MODIFY | Tighten assertions: both `home-smoke` and `blog-post-smoke` registered; descriptions non-empty; `pages` arrays match what the fn imports. |
| **NEW or MANUAL** smoke validation evidence | CAPTURE | Plan 03-02 must execute `npm run smoke` against the real demo target (QAbbalah) and capture: (a) k6 console summary showing all 3 thresholds passing, (b) exit code 0, (c) `Resolved base URL: https://othrondir.github.io/QAbbalah/`. Land evidence in `03-02-SUMMARY.md`. |
| `k6/simulations/smoke/smoke-shell.test.ts` | DELETE (or MOVE) | Once the new entry is canonical, the Phase 1 shell is dead code. Recommendation: delete in 03-02 after smoke validation passes. |
| `scripts/validate-build.mjs` | MODIFY | Remove `dist/tests/smoke/smoke-shell.test.js` from `requiredFiles` once the entry is deleted (do this LAST in 03-02 — only after smoke run is confirmed green). |
| `vite.config.ts` | OPTIONAL CLEANUP | After the shell is deleted, the `globSync('./k6/simulations/**/*.test.ts')` returns `[]` so the entries map is empty for that branch. Either leave the code in place (forward-compat for k6/ tree) or remove the glob. Leave in place — k6/ tree may host other test material. |

---

## 5. Scenario Authoring Pattern

### 5.1 `Scenario` type

```ts
// lib/scenarios/index.ts (or lib/scenarios/types.ts if extracted)
import type { Page } from 'k6/browser';
import type { K6PlaywrightSelectors } from '@pages/base/selectors';

/**
 * Context passed to every scenario function.
 * - `page`: the k6 browser Page constructed by the simulation entrypoint.
 * - `selectors`: a fresh K6PlaywrightSelectors instance for the same page.
 *   Scenarios can either use this directly or rely on their POMs (which carry
 *   their own internal selectors via K6Page).
 */
export interface ScenarioContext {
  page: Page;
  selectors: K6PlaywrightSelectors;
}

export type ScenarioFn = (ctx: ScenarioContext) => Promise<void>;

export interface Scenario {
  fn: ScenarioFn;
  description: string;
  pages: readonly string[];  // Names of POMs the scenario exercises, for the registry-shape test
}
```

Discussion:
- **Why `pages: readonly string[]`?** Lets the registry-shape test introspect "this scenario claims to exercise HomePage + PostPage." Cheap documentation; no runtime use.
- **Why not pass POMs into the context?** Recruiter readability: each scenario does `new HomePage(page)` in 1 line. Pre-constructing in the entry adds indirection.
- **Why `selectors` in context if scenarios mostly use POMs?** Some assertions (e.g., site-level "Posts" link in nav, expect text on a footer) read naturally with `selectors.getByText('Posts')` directly. Including it keeps the option open without forcing scenarios to construct it themselves.

### 5.2 Registry shape (D-51)

```ts
// lib/scenarios/index.ts
import { homeSmokeScenario } from './home-smoke';
import { blogPostSmokeScenario } from './blog-post-smoke';

export const SCENARIO_REGISTRY: Record<string, Scenario> = {
  'home-smoke': {
    fn: homeSmokeScenario,
    description: 'Navigate to HomePage; verify masthead, navigation, and posts list visibility.',
    pages: ['HomePage'],
  },
  'blog-post-smoke': {
    fn: blogPostSmokeScenario,
    description: 'Navigate to HomePage; open a post; verify PostPage title and body visibility.',
    pages: ['HomePage', 'PostPage'],
  },
} as const;
```

A maintainer adds a scenario by writing one file under `lib/scenarios/<id>.ts` and adding ONE entry to this map (matching D-51 "one import + one entry"). The recruiter scans this file to see every available smoke scenario.

### 5.3 Concrete scenario shape

```ts
// lib/scenarios/home-smoke.ts
import { sleep } from 'k6';
import { HomePage } from '@pages/HomePage';
import type { ScenarioFn } from './index';

/**
 * home-smoke — exercises the HomePage POM and the k6-only `measureNavigation()`
 * patch end-to-end. This is the recruiter narrative scenario: one command runs
 * sync -> convert -> patch -> k6 browser -> real demo -> measured navigation.
 */
export const homeSmokeScenario: ScenarioFn = async ({ page }) => {
  const home = new HomePage(page);

  const navMs = await home.measureNavigation();
  console.log(`[home-smoke] navigation completed in ${navMs}ms`);

  // 2-3 visibility assertions on key composed components (D-57).
  // These exercise the K6Page contract + component composition + the
  // upstream POM identity (NavigationComponent, BlogPostComponent).
  await home.getMainContentLocator().waitFor({ state: 'visible', timeout: 10000 });
  await home.navigation.isVisible();             // exercises NavigationComponent
  await home.blogPosts.getPostsContainerLocator().waitFor({ state: 'visible', timeout: 10000 });

  sleep(1);  // D-58 — single pacing step
};
```

```ts
// lib/scenarios/blog-post-smoke.ts
import { sleep } from 'k6';
import { HomePage } from '@pages/HomePage';
import { PostPage } from '@pages/PostPage';
import type { ScenarioFn } from './index';

/**
 * blog-post-smoke — exercises two POMs (HomePage + PostPage) to demonstrate
 * the registry has depth: more than one journey, more than one page object.
 */
export const blogPostSmokeScenario: ScenarioFn = async ({ page }) => {
  const home = new HomePage(page);
  const post = new PostPage(page);

  await home.navigate();
  await home.getMainContentLocator().waitFor({ state: 'visible', timeout: 10000 });
  sleep(1);

  // Open the first post. blogPosts.clickPostByIndex(0) waits for networkidle internally.
  await home.blogPosts.clickPostByIndex(0);

  // Verify PostPage content (2 visibility assertions covering title + body).
  await post.getPostTitleLocator().waitFor({ state: 'visible', timeout: 10000 });
  await post.getPostBodyLocator().waitFor({ state: 'visible', timeout: 10000 });

  sleep(1);  // D-58
};
```

[VERIFIED via reading `lib/pages/HomePage.ts`, `lib/pages/PostPage.ts`, `lib/pages/components/NavigationComponent.ts`, `lib/pages/components/BlogPostComponent.ts`] All the locators and methods referenced above exist in the generated POMs today. `HomePage.measureNavigation` is in the patch (`lib/pages-k6-patches/HomePage.k6-patch.ts`) and is injected during convert.

### 5.4 Simulation entrypoint

```ts
// lib/simulations/smoke.ts
import { browser } from 'k6/browser';
import { K6PlaywrightSelectors } from '@pages/base/selectors';
import { SCENARIO_REGISTRY } from '@lib/scenarios';

declare const __ENV: Record<string, string | undefined>;

export const options = {
  scenarios: {
    browser: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 1,
      options: {
        browser: { type: 'chromium' },
      },
    },
  },
  thresholds: {
    browser_web_vital_lcp: ['p(95)<3000'],
    http_req_failed: ['rate<0.01'],
    iteration_duration: ['p(95)<15000'],
  },
};

export default async function smokeSimulation(): Promise<void> {
  const scenarioId = __ENV.SCENARIO ?? 'home-smoke';
  const entry = SCENARIO_REGISTRY[scenarioId];

  if (!entry) {
    const available = Object.keys(SCENARIO_REGISTRY).join(', ');
    throw new Error(`Unknown scenario '${scenarioId}'. Available: ${available}`);
  }

  const page = await browser.newPage();
  const selectors = new K6PlaywrightSelectors(page);

  console.log(`[easyk6] smoke scenario=${scenarioId} (${entry.description})`);

  try {
    await entry.fn({ page, selectors });
  } finally {
    await page.close();
  }
}
```

### 5.5 Registry unit test pattern

```ts
// tests/unit/scenarios-registry.test.mjs (sketch)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import ts from 'typescript';

// Load lib/scenarios/index.ts via ts.transpileModule + data-URL pattern (mirrors k6page-base.test.mjs).
// Scenarios import POMs and k6 modules — stub @pages, @lib, and `k6` to avoid pulling the browser runtime.
// ... (~50 lines including stubs)

test('registry exposes home-smoke and blog-post-smoke', () => {
  const ids = Object.keys(SCENARIO_REGISTRY);
  assert.ok(ids.includes('home-smoke'));
  assert.ok(ids.includes('blog-post-smoke'));
});

test('every registry entry has fn, description, pages', () => {
  for (const [id, entry] of Object.entries(SCENARIO_REGISTRY)) {
    assert.equal(typeof entry.fn, 'function', `${id}.fn must be a function`);
    assert.equal(typeof entry.description, 'string', `${id}.description must be a string`);
    assert.ok(entry.description.length > 0, `${id}.description must be non-empty`);
    assert.ok(Array.isArray(entry.pages), `${id}.pages must be an array`);
    assert.ok(entry.pages.length > 0, `${id}.pages must list at least one POM`);
  }
});

test('unknown scenario lookup returns undefined', () => {
  assert.equal(SCENARIO_REGISTRY['does-not-exist'], undefined);
});
```

[ASSUMED] The data-URL transpile pattern from Phase 2 will work for the registry test, but importing `home-smoke.ts` (which imports from `@pages/HomePage`) will pull in the full k6 runtime chain. Two options: (a) stub `@pages/HomePage` and `@pages/PostPage` with empty class shims in the test, (b) keep the test introspective — assert only the registry's KEYS and METADATA (`description`, `pages`), do NOT invoke `entry.fn`. Recommendation: (b). The registry-shape test is about registry shape, not about scenario correctness — scenario correctness is asserted by the real smoke run in Plan 03-02.

---

## 6. Validation Architecture

[Nyquist enabled via `.planning/config.json:workflow.nyquist_validation: true` — included.]

### 6.1 Test Framework

| Property | Value |
|----------|-------|
| Framework | `node:test` (Node 22 built-in), already in use across Phase 1 + 2 |
| Config file | None — test discovery is per-script `node --test <path>` |
| Quick run command | `node --test tests/unit/scenarios-registry.test.mjs tests/unit/runtime-config.test.mjs tests/unit/perf-runner.test.mjs` |
| Full suite command | `node --test tests/unit/*.test.mjs tests/integration/*.test.mjs` |

### 6.2 Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| BUILD-03 | `npm run smoke` launches the smoke entry against the demo target and exits 0 | smoke (real k6) | `npm run smoke` against `https://othrondir.github.io/QAbbalah/` | manual — Plan 03-02 captures evidence in SUMMARY |
| BUILD-03 (dry) | runner produces a `k6 run dist/simulations/smoke.js -e SCENARIO=home-smoke` command line | unit | `node --test tests/unit/perf-runner.test.mjs` | ✅ exists, needs the entry-path regex update |
| SCEN-01 | Registry exposes `home-smoke` and `blog-post-smoke` with required fields | unit | `node --test tests/unit/scenarios-registry.test.mjs` | ❌ Wave 0 — create file |
| SCEN-02 | Both scenarios run end-to-end against QAbbalah (visibility assertions + measureNavigation hit the patch) | smoke (real k6) | `npm run perf -- --profile smoke --scenario home-smoke --demo` then `--scenario blog-post-smoke --demo` | manual — Plan 03-02 captures evidence |
| SCEN-03 | `--scenario <id>` and `__ENV.SCENARIO` reach the simulation | unit + smoke | unit: assert runner argv includes `-e SCENARIO=<id>`; smoke: run with `--scenario blog-post-smoke` and observe the blog-post log line | unit needs new assertion in `perf-runner.test.mjs`; smoke manual |
| SCEN-03 (unknown id) | Unknown scenario fails fast with available-IDs list | smoke (real k6) | `npm run perf -- --profile smoke --scenario does-not-exist --demo` exits non-zero with the listing | manual — Plan 03-02 captures evidence |
| PROF-01 | k6 options shape is the 1 VU / 1 iter / shared-iterations / 3 thresholds (smoke is deterministic, low-resource) | static + smoke | static: grep `lib/simulations/smoke.ts` for the threshold + vus + iterations literals; smoke: real run output shows the executor and threshold pass/fail | static: add a test that imports the smoke module and asserts `options.scenarios.browser.vus === 1 && iterations === 1 && executor === 'shared-iterations'` and `options.thresholds` has the 3 expected metrics |

### 6.3 Sampling Rate

- **Per task commit:** `node --test tests/unit/scenarios-registry.test.mjs tests/unit/runtime-config.test.mjs tests/unit/perf-runner.test.mjs`
- **Per wave merge:** `node --test tests/unit/*.test.mjs tests/integration/*.test.mjs && npm run build && npm run validate:build`
- **Phase gate (before `/gsd-verify-work`):** Full suite green + real `npm run smoke` against `https://othrondir.github.io/QAbbalah/` exits 0 with thresholds passing.

### 6.4 Wave 0 gaps

- [ ] `tests/unit/scenarios-registry.test.mjs` — covers SCEN-01, partial SCEN-02 (registry-shape only)
- [ ] Smoke options unit test (could live in `tests/unit/smoke-options.test.mjs` or be tacked onto `scenarios-registry.test.mjs`) — covers PROF-01
- [ ] Runtime-config + perf-runner test UPDATES (existing files, new assertions) — covers BUILD-03 dry-run

No new framework install needed. `node:test` + the `ts.transpileModule` data-URL loader pattern is already in use.

### 6.5 Nyquist-style undersampling risks

The smoke profile is `vus: 1, iterations: 1`. That is the lowest possible signal — a single sample point. This is intentional (D-64, ROADMAP SC #4) and the right shape for a recruiter demo, but it carries undersampling risks the planner should know:

| Risk | Description | Mitigation |
|------|-------------|------------|
| **Single-iteration variance hides regressions** | LCP and `iteration_duration` are p(95) thresholds over N=1. Any single bad run trips them; any single good run masks slowness. | Accepted — smoke is a "did it work" check, not a "is performance regressing" check. Phase 4 load/capacity profiles get higher VU counts where p(95) becomes meaningful. |
| **GitHub Pages cold cache** | First request after long idle hits CloudFlare cold cache; LCP can spike from ~1200ms to ~2500ms. | D-66 threshold `p(95)<3000` already includes ~500ms headroom. If smoke flakes during Plan 03-02 validation, raise to `p(95)<4000`. Do NOT pre-warm — recruiter narrative is "fresh run." |
| **Network variance on developer laptops** | Home Wi-Fi → GitHub Pages varies 50-500ms latency. With a single iteration this is a large fraction of LCP. | `iteration_duration: p(95)<15000` gives huge headroom. LCP threshold survives 95th-percentile network noise but a single outlier WILL trip it. Honest reporting: smoke is flakier than it looks. |
| **Threshold-as-canary vs threshold-as-gate** | D-66 thresholds make smoke a gate (exit non-zero on breach). With N=1, the gate has high false-positive rate. | This is acceptable for v1 because the gate IS the recruiter narrative: "smoke produces a real pass/fail, not just a console summary." Phase 4 PROF-04 can refine. |
| **Drift over time** | QAbbalah is hosted on GitHub Pages; layout changes upstream could shift LCP without warning. | Out of scope for Phase 3. Phase 5 docs can flag the dependency. |

**Honest report:** Single-iteration smoke is the right tool for the showcase but it is NOT a perf regression detector. The threshold values are conservative-to-the-point-of-loose specifically because we cannot Nyquist-sample at N=1.

---

## 7. Open Questions / Landmines (RESOLVED)

| # | Question / Landmine | Recommendation |
|---|---------------------|----------------|
| Q1 | After the converter strip-rule for BasePage lands, the UPST-03 round-trip byte-equality test will see a smaller file (dangling import gone). The test asserts byte-identical output across TWO runs — that invariant still holds. But the fixture's recorded byte length (4359/4361 bytes) becomes wrong. | Re-record once and commit. Better: replace any hardcoded length assertion with `assert.equal(firstOutput, secondOutput)` (the actual UPST-03 invariant). Already mostly the case — confirm during Plan 03-01 execution. |
| Q2 | Does Vite's `globSync('./lib/simulations/**/*.ts')` need a TypeScript build excluded for `.test.ts` files? | No — `lib/simulations/smoke.ts` is NOT a `.test.ts`. Glob matches all `.ts` under that path. If a future test file accidentally lands under `lib/simulations/`, it will be bundled as an entry. Document this in `vite.config.ts` with a comment, OR add a `.test.ts` exclude filter to the glob. |
| Q3 | Does the `K6Page.navigate()` method consult `pageUrl` correctly? `HomePage.pageUrl = ''` (empty); should that make `navigate()` no-op? | [VERIFIED via reading `lib/pages/base/base-page.ts:26-31`] Yes — `if (this.pageUrl) { await this.page.goto(this.pageUrl); }` — empty string is falsy, no goto. But `HomePage` overrides `navigate()` to do `await super.navigate(); await this.waitForHomePageContent();` — which means with empty `pageUrl`, the home scenario relies on the base URL being injected... HOW? The Phase 1 smoke shell does `await page.goto(runtimeConfig.baseUrl)` explicitly. The new smoke entry does NOT. **Open landmine: `HomePage.navigate()` will not visit any URL unless something else calls `page.goto(BASE_URL)` first.** |
| Q3.1 | Fix for Q3 | Two options. (a) Add a `await page.goto(__ENV.BASE_URL ?? DEMO_BASE_URL)` step in `lib/simulations/smoke.ts` BEFORE calling `entry.fn`. The scenarios then assume the page is already at the base URL. (b) Update `HomePage.pageUrl = ''` to a sentinel that `K6Page.navigate()` interprets as "goto BASE_URL from env." Recommendation: **(a)**. Single explicit `page.goto(BASE_URL)` in the simulation entry is recruiter-readable. Scenarios stay clean. The `measureNavigation()` patch then measures from goto-to-content-visible, which is the correct semantic. |
| Q4 | `home-smoke` default — should the simulation emit a one-line summary at the end ("scenario X completed in Y ms")? | D-67 says k6 default console summary only; no `handleSummary`. The simulation function can `console.log` a single line at the end without violating D-67 (it's not a summary hook, just a log). Already shown in §5.4 sketch. Plan 03-02 can decide phrasing. |
| Q5 | The `--scenario` flag in `RUNTIME_FLAG_DEFINITIONS` is already plumbed (Phase 1). Does its CLI value reach `__ENV.SCENARIO` via k6? | [VERIFIED via reading `scripts/perf-runner.mjs:78-110`] Today no. `runK6` injects `K6_SCENARIO` into the k6 process env but does NOT pass `-e SCENARIO=` on the argv. Plan 03-01 task adds the `-e` flag (D-61). Confirm by adding a `perf-runner` test that spawns `--scenario foo --dry-run` and asserts the printed k6 command contains `-e SCENARIO=foo`. |
| Q6 | Should the unknown-scenario error message use single-line CSV or bullet-list format? | Claude's discretion per CONTEXT. Recommendation: single-line CSV. Recruiter-readable, fits in one `stderr` line. `Unknown scenario 'foo'. Available: home-smoke, blog-post-smoke`. |
| Q7 | Will the existing `k6/simulations/smoke/smoke-shell.test.ts` shell still build (and pass validate-build) during the Plan 03-01 transition wave? | Yes — Vite continues to discover it via the existing glob. Both `dist/tests/smoke/smoke-shell.test.js` and `dist/simulations/smoke.js` will exist after 03-01. `validate-build.mjs` checks for both during the transition; remove the old check in 03-02 after the shell is deleted. |
| Q8 | Does k6 1.5.x require any special flag for browser tests (e.g., `K6_BROWSER_ENABLED`)? | [ASSUMED] No — since k6 0.43 the `k6/browser` module is built-in to k6 binaries (no separate xk6-browser). Verified indirectly: Phase 1's smoke-shell ran successfully without any browser-enable flag. |
| Q9 | k6 1.5.x is pinned in `package.json:toolVersions:k6` but recent web fetch shows k6 v2.0.0 is the actual current release (May 2026). | Out of scope for Phase 3. CLAUDE.md pins 1.5.x and the project decisions assume that line. Note for Phase 5 docs review: if recruiters install latest k6, they get v2.0.0 — confirm the threshold metric names still hold (they should — these names are stable since 0.x). |
| Q10 | Does `dist/simulations/smoke.js` need source maps for k6 debug output? | [ASSUMED] No — Phase 1 builds with `sourcemap: false` and that's sufficient for k6 stack traces against the bundled file. Keep `false`. |


**Resolution footer:** All ten questions resolved — Q1 via Task 9 fixture re-check; Q3/Q3.1 via Task 5 explicit `page.goto`; Q5 via Task 7 `-e SCENARIO` argv; Q6 via Task 5 error format; Q7 via Task 8 dual-entry transition + Task 3 of 03-02 shell delete; Q2/Q4/Q8/Q9/Q10 deferred or ASSUMED LOW-RISK (documented in §7 rows + §Assumptions Log).

---

## 8. Sources

### Primary (HIGH confidence — VERIFIED via local file reads)
- `.planning/phases/03-smoke-scenarios-supported-execution/03-CONTEXT.md` — D-51..D-68 locked decisions
- `.planning/phases/02-upstream-sync-k6-adaptation/02-VERIFICATION.md` §Carry-Forward Concerns — BasePage dangling import documented as Phase 3 follow-up
- `.planning/phases/02-upstream-sync-k6-adaptation/02-REVIEW.md` — WR-01..WR-05 robustness warnings
- `.planning/phases/02-upstream-sync-k6-adaptation/deferred-items.md` §3 — `.gitkeep` wipe behavior
- `.planning/REQUIREMENTS.md` — BUILD-03, SCEN-01..03, PROF-01
- `.planning/ROADMAP.md` §Phase 3 — goal, success criteria
- `.planning/STATE.md` — Phase 2 closed, Phase 3 starting position
- `lib/pages/HomePage.ts`, `lib/pages/PostPage.ts`, `lib/pages/AboutPage.ts` — generated POM shape + the residual `import { BasePage }` lines
- `lib/pages/components/NavigationComponent.ts`, `lib/pages/components/BlogPostComponent.ts` — visibility-assertion target locators
- `lib/pages-k6-patches/HomePage.k6-patch.ts` — `measureNavigation` body
- `lib/pages/base/base-page.ts` (K6Page) + `lib/pages/base/selectors.ts` (K6PlaywrightSelectors) — scenario-facing contract
- `lib/config/runtime-config.ts` — `resolveEntryFile`, `DEFAULT_SCENARIO`, `PHASE_ONE_SMOKE_ENTRY_FILE`
- `scripts/perf-runner.mjs` — spawn args, env injection, dry-run formatter
- `scripts/convert-pages.mjs` — `SKIP_FILES`, `emptyLibPagesExceptBase`
- `scripts/lib/transforms.mjs` — `stripPlaywrightImports`, `stripDuplicateK6Imports`, `ensureExtendsK6Page`
- `scripts/validate-build.mjs` — `requiredFiles`
- `vite.config.ts` — glob entries, aliases, externals
- `tsconfig.json` — path mappings
- `package.json` — script lines, tool versions
- `tests/unit/runtime-config.test.mjs`, `tests/unit/perf-runner.test.mjs`, `tests/unit/k6page-base.test.mjs` — existing test contracts + the `ts.transpileModule` + data-URL loader pattern
- `k6/simulations/smoke/smoke-shell.test.ts` — Phase 1 shell entry, source of the `shared-iterations` options shape

### Secondary (HIGH confidence — CITED from official docs)
- https://grafana.com/docs/k6/latest/using-k6-browser/metrics/ — confirmed `browser_web_vital_lcp` canonical metric name + full list of browser web vital metrics
- https://grafana.com/docs/k6/latest/using-k6-browser/running-browser-tests/ — confirmed `shared-iterations` executor + `options.browser.type: 'chromium'` shape
- https://grafana.com/docs/k6/latest/using-k6-browser/recommended-practices/ — referenced for executor + iteration guidance
- https://grafana.com/docs/k6/latest/using-k6/environment-variables/ — `__ENV` / `-e KEY=VALUE` plumbing
- https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/shared-iterations/ — executor semantics

### Tertiary (informational only)
- `../ir-perf-k6/k6/simulations/frontend-performance-simulation.test.ts` — adapted dispatch shape (stripped of SCENARIO_MODE, PARALLELISM, capacity logic, monitor/api-client/screenshots — all out of scope for v1)
- `../ir-perf-k6/k6/scenarios/templates/scenario-template.ts` — boilerplate hints (login flow + screenshots dropped for showcase)
- https://github.com/grafana/k6/releases — k6 release timeline; informational only (CLAUDE.md pins 1.5.x; current stable as of 2026-05 is v2.0.0)

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `http_req_failed` and `iteration_duration` units (rate, ms respectively) and threshold-name stability | §2.2 | LOW — these are k6 standard metrics, stable since 0.x; if names changed the existing Phase 1 smoke-shell would fail today |
| A2 | LCP/iteration-duration tolerances (3s/15s p95) survive GitHub Pages cold-cache + home Wi-Fi variance | §2.2, §6.5 | MEDIUM — flake risk during Plan 03-02 validation; mitigation is documented (raise to 4s if needed) |
| A3 | k6 1.5.x exposes `__ENV.SCENARIO` from `-e SCENARIO=...` argv | §2.3 | LOW — standard k6 pattern since 0.x, used widely in `ir-perf-k6` |
| A4 | Throwing from the default exported simulation function before any browser action produces a clean non-zero exit with the error message in stderr | §2.3 | LOW — standard k6 behavior, but unverified for THIS specific failure mode in 1.5.x |
| A5 | `options.browser.type: 'chromium'` is required (not optional) for the browser module to launch | §2.4 | LOW — Phase 1 shell uses it; removing it has caused null-page crashes in older k6 versions |
| A6 | The ts.transpileModule + base64 data-URL loader pattern works for `lib/scenarios/index.ts` if `@pages/*` imports are stubbed | §5.5, §6.4 | MEDIUM — untested; if it fails the registry test falls back to introspection-only (no fn invocation), which is the recommended shape anyway |
| A7 | `HomePage.pageUrl = ''` + `K6Page.navigate()` empty-string no-op means scenarios must `page.goto(BASE_URL)` BEFORE invoking POM methods | §7 Q3 | HIGH — if not handled, smoke runs against blank page and every assertion fails. Mitigation: explicit `page.goto(baseUrl)` in `lib/simulations/smoke.ts` before `entry.fn`. |
| A8 | The `K6Page.waitForLoadState` runtime feature-detect (Phase 2 A1) works in k6 1.5.x — i.e., `'waitForLoadState' in this.page` returns true | §5.3 | LOW — already verified in Phase 2; documented as A1 in `base-page.ts:33-39` |
| A9 | Vite's `globSync('./lib/simulations/**/*.ts')` discovers `.ts` files and produces `dist/simulations/smoke.js` with the existing rollup config | §4 | LOW — same pattern as existing `./k6/simulations/**/*.test.ts` glob; rollup CJS output config is identical |
| A10 | `k6 run -e SCENARIO=blog-post-smoke dist/simulations/smoke.js` is the canonical CLI form (no quoting issues on Windows PowerShell) | §2.3, §4 | LOW — PowerShell handles `-e SCENARIO=blog-post-smoke` without quoting; the value has no shell metacharacters |

**Claims tagged `[ASSUMED]`:** A1, A2, A3, A4, A5, A6, A7, A8, A9, A10. The highest-impact one is A7 (Q3 landmine) — Plan 03-01 MUST add an explicit `page.goto(baseUrl)` in the simulation entry to handle the empty-`pageUrl` case for HomePage.

---

## Metadata

**Confidence breakdown:**
- Standard stack & options shape: HIGH — confirmed via Phase 1 smoke shell + official k6 docs
- Carry-forward concerns (BasePage import, .gitkeep): HIGH — verified via grep against the live `lib/pages/` tree and Phase 2 deferred-items doc
- Threshold tolerances: MEDIUM — values are training-derived sane defaults; Plan 03-02 may need to retune after first real run
- Q3 landmine (HomePage.navigate empty pageUrl): HIGH — verified by reading the K6Page implementation
- Registry test loader pattern: MEDIUM — works for K6Page (verified in `k6page-base.test.mjs`), unverified for the registry chain with stubbed `@pages/*`

**Research date:** 2026-05-11
**Valid until:** 2026-06-11 (k6 browser module is stable; revisit if k6 minor changes thresholds-API or browser metrics)

---

## RESEARCH COMPLETE
