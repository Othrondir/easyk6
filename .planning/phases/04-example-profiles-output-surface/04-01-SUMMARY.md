---
phase: 04-example-profiles-output-surface
plan: 01
subsystem: handle-summary-shared-helper+smoke-regression
tags: [prof-04, handle-summary, shared-helper, smoke-regression, wave-0-red, wave-1-green, goja-safe, d-11, d-16, d-19]

# Dependency graph
requires:
  - phase: 03-smoke-scenarios-supported-execution
    plan: 02
    provides: lib/simulations/smoke.ts (Phase 3 D-63..D-67 shape with options literal + default smokeSimulation + Q3 page.goto landmine fix), tests/unit/scenarios-registry.test.mjs::loadSmokeOptions (multi-source data-URL stub loader pattern), 84/84 test baseline, dist/simulations/smoke.js emit contract, validate-build 4-file required list.
provides:
  - lib/simulations/lib/format-md.ts (172 lines) — pure markdown formatter implementing CONTEXT D-11 5-section structure (header / what ran / thresholds table / key metrics table / footer). Goja-safe by construction: zero imports, no `new URL` / `Buffer` / `process` / `node:*`. Walks `data.metrics` via `Object.entries` + optional chaining; renders `browser_http_req_duration p(95)` as the literal string `n/a (no samples — browser scenario)` when sample count is 0 or `values['p(95)']` is missing (RESEARCH Pitfall 1 + Phase 03-02 SUMMARY Run 1 evidence — k6/browser routes through chromium and leaves k6/http series empty). `describeProfile()` returns the literal profile name for unknown profiles so the formatter is forward-compatible with future profile additions.
  - lib/simulations/lib/format-json.ts (18 lines) — one-line pure JSON formatter: `export function formatJson(data: unknown): string { return JSON.stringify(data ?? {}, null, 2); }`. The `?? {}` guard prevents an undefined payload from breaking the artifact emission chain. Zero imports; `JSON.stringify` is goja-safe ES stdlib.
  - lib/simulations/lib/summary.ts (59 lines) — `makeHandleSummary(metadata)` factory exporting + `ProfileMetadata` interface. Captures `profile` + `scenarioGetter` + `baseUrlGetter` in closure (CONTEXT D-16). Returned `handleSummary(data)` emits `Record<string, string>` with POSIX forward-slash keys `reports/<profile>-<scenario>.md` + `.json`. `scenarioGetter` returning empty/whitespace string falls back to `'home-smoke'`. Exactly 2 imports (`./format-md` + `./format-json`); zero goja-unsafe constructs. `new Date().toISOString()` for `runDateIso` (goja-safe per RESEARCH A5). Getters defer `__ENV` reads to call-time (RESEARCH Pitfall 4 — k6 populates `__ENV` after module-init).
  - lib/simulations/smoke.ts (modified) — adds `import { makeHandleSummary } from './lib/summary';` to imports and `export const handleSummary = makeHandleSummary({ profile: 'smoke', scenarioGetter: () => __ENV.SCENARIO ?? 'home-smoke', baseUrlGetter: () => __ENV.BASE_URL ?? '' });` after the existing `options` block. `options` literal, `declare const __ENV`, and the default `smokeSimulation` function body are UNCHANGED. D-66 thresholds verbatim (`p(95)<3000` / `rate<0.01` / `p(95)<15000`). Smoke stays unbannered per D-14.
  - tests/unit/summary-format-md.test.mjs (157 lines) — 5 tests covering D-11 5-section structure with smoke-shape (0-sample `browser_http_req_duration` → `n/a (no samples — browser scenario)`) and load-shape (224.39 ms rendered) fixtures. Uses the single-source `loadTypeScriptModule` pattern from `tests/unit/runtime-config.test.mjs:20-32` (`format-md.ts` has zero relative imports).
  - tests/unit/summary-format-json.test.mjs (62 lines) — 3 tests covering deterministic `JSON.stringify(data, null, 2)` output, `JSON.parse` round-trip, undefined-input guard.
  - tests/unit/summary-factory.test.mjs (123 lines) — 4 tests covering exact key naming (`reports/<profile>-<scenario>.md`/`.json`), scenarioGetter empty-string fallback to `home-smoke`, POSIX forward-slash audit. Uses the multi-source data-URL stub pattern from `tests/unit/scenarios-registry.test.mjs:124-180` to rewrite `summary.ts`'s `./format-md` and `./format-json` imports to stub data URLs.
  - tests/unit/scenarios-registry.test.mjs (modified) — extends `loadSmokeOptions` `stubs` object with a `./lib/summary` parse-time stub (`export function makeHandleSummary() { return () => ({}); }`) so the data-URL loader can parse smoke.ts's new factory import. Both pre-existing smoke-options tests stay GREEN with no assertion changes.
affects:
  - "tests/unit/scenarios-registry.test.mjs": "stubs object extended by 1 key (`./lib/summary`); no test assertion changes; 5/5 registry tests + 2/2 smoke-options tests stay green."
tech-stack:
  added: []
  patterns:
    - "Pure-function carve-out pattern (mirror of `lib/config/runtime-config.ts::normalizeBaseUrl`) applied to format-md.ts + format-json.ts so the formatters are Node-unit-testable and goja-safe simultaneously."
    - "Factory closure pattern (mirror of `resolveRuntimeConfig` shape) capturing profile metadata + lazy `__ENV` getters at the call site rather than at module init."
    - "Multi-source data-URL stub loader (Plan 03-01/02 pattern) extended to a new sibling-relative-imports surface (`./format-md` + `./format-json`) in summary-factory.test.mjs."
key-files:
  created:
    - "lib/simulations/lib/format-md.ts"
    - "lib/simulations/lib/format-json.ts"
    - "lib/simulations/lib/summary.ts"
    - "tests/unit/summary-format-md.test.mjs"
    - "tests/unit/summary-format-json.test.mjs"
    - "tests/unit/summary-factory.test.mjs"
  modified:
    - "lib/simulations/smoke.ts"
    - "tests/unit/scenarios-registry.test.mjs"
decisions:
  - "format-md.ts and format-json.ts split into two files (rather than one) per CONTEXT D-16 Claude's-discretion option. The split enables zero-import single-source `loadTypeScriptModule` testing for each formatter without needing the multi-source data-URL stub pattern for the pure-function tests."
  - "The `n/a (no samples — browser scenario)` empty-metric fallback is a LITERAL string (not a computed value). Both the formatter and the RED test fixture grep-match against the same literal, locking the contract end-to-end."
  - "`makeHandleSummary` uses `scenario.trim() || 'home-smoke'` rather than `scenario || 'home-smoke'`. Both empty string `''` AND whitespace-only `'   '` collapse to the fallback — defensive against an oddly-quoted `__ENV.SCENARIO`."
  - "The `formatMarkdown(data as never, meta)` cast in summary.ts is intentional. `formatMarkdown`'s parameter type is `K6Data` (a structural interface with optional `metrics`). `data: unknown` at the factory boundary can't be safely narrowed without a runtime guard, and the formatter is internally defensive (optional chaining throughout). `as never` preserves the goja-safety contract (zero runtime cost) while signalling 'trust the caller here'."
metrics:
  duration_minutes: 4
  task_count: 5
  files_created: 6
  files_modified: 2
  tests_added: 12
  total_tests_after: 96
  commits: 5
  completed_at: "2026-05-11T20:55:38Z"
---

# Phase 4 Plan 01: Shared handleSummary Helper + Smoke Regression Summary

PROF-04 foundation: `lib/simulations/lib/summary.ts` factory composing `format-md` / `format-json` pure formatters; smoke.ts rewired through `makeHandleSummary({ profile: 'smoke', ... })` with zero behavioral change to the `options` literal or default simulation body. 12 new RED→GREEN unit tests; 96/96 total tests pass; build + validate-build green.

---

## Status

| Task | Type | Wave | State | Commit |
|------|------|------|-------|--------|
| Task 1 | auto, tdd | Wave 0 RED | ✅ COMPLETE | `3c9baff` — 3 RED test files (12 tests) failing for documented ENOENT reasons |
| Task 2 | auto, tdd | Wave 1 GREEN | ✅ COMPLETE | `89cf07c` — format-md.ts authored; 5/5 markdown tests GREEN |
| Task 3 | auto, tdd | Wave 1 GREEN | ✅ COMPLETE | `f704f46` — format-json.ts authored; 3/3 JSON tests GREEN |
| Task 4 | auto, tdd | Wave 1 GREEN | ✅ COMPLETE | `ae5403e` — summary.ts factory authored; 4/4 factory tests GREEN |
| Task 5 | auto, tdd | Wave 1 GREEN | ✅ COMPLETE | `5371ae2` — smoke.ts wired through factory; loadSmokeOptions stubs extended; full green-bar gate (96 tests + build + validate-build) GREEN |

---

## Test Count Delta

| Phase | Tests | Δ |
|-------|-------|---|
| Phase 1-3 baseline (post Plan 03-02) | 84 | — |
| Plan 04-01 Wave 0 RED tests authored (Task 1) | 84 + 0 GREEN | 3 RED files failing intentionally |
| Plan 04-01 GREEN | 96 | +12 (5 md + 3 json + 4 factory) |

`node --test tests/unit/*.test.mjs tests/integration/*.test.mjs` reports `# pass 96 / # fail 0 / # duration_ms ~1280`.

---

## Goja-Safety Grep Audit

The formatter triple under `lib/simulations/lib/` must contain ZERO goja-unsafe constructs (CONTEXT D-19). Audit command and result:

```
grep -nE "(new URL\(|Buffer|\bprocess\b|'node:|from 'fs'|from 'path')" \
  lib/simulations/lib/format-md.ts \
  lib/simulations/lib/format-json.ts \
  lib/simulations/lib/summary.ts
```

Result — 2 matches, BOTH JSDoc references inside `/** ... */` comments listing what's forbidden (documentation, not code):

```
lib/simulations/lib/summary.ts:22: *   - No `new URL`, no Buffer, no process, no Node fs/path.
lib/simulations/lib/format-md.ts:5: *   - No `new URL`, no Buffer, no process, no fs, no path module.
```

Zero matches in actual code. Contract intact.

Import statement audit:

```
grep -c "^import" lib/simulations/lib/format-md.ts   →  0
grep -c "^import" lib/simulations/lib/format-json.ts →  0
grep -c "^import" lib/simulations/lib/summary.ts     →  2  (./format-md + ./format-json, sibling relative paths only)
```

---

## Smoke Regression Evidence

`tests/unit/scenarios-registry.test.mjs` `loadSmokeOptions` loader extended with one new stub (`./lib/summary`); both pre-existing smoke-options tests STAY GREEN:

```
# Subtest: smoke options: 1 VU / 1 iter / shared-iterations / chromium browser
ok 4 - smoke options: 1 VU / 1 iter / shared-iterations / chromium browser
# Subtest: smoke options: thresholds use D-66 verbatim strings
ok 5 - smoke options: thresholds use D-66 verbatim strings
```

D-66 threshold strings grep-audit (smoke.ts):

```
lib/simulations/smoke.ts:38:    browser_web_vital_lcp: ['p(95)<3000'],
lib/simulations/smoke.ts:39:    http_req_failed: ['rate<0.01'],
lib/simulations/smoke.ts:40:    iteration_duration: ['p(95)<15000'],
```

Factory-invocation audit (smoke.ts):

```
lib/simulations/smoke.ts:53:export const handleSummary = makeHandleSummary({
lib/simulations/smoke.ts:54:  profile: 'smoke',
```

EXAMPLE-PROFILE banner audit (smoke.ts):

```
grep -c "EXAMPLE PROFILE" lib/simulations/smoke.ts  →  0
```

Smoke stays unbannered per D-14.

---

## Build Evidence

`npm run build` (vite 5.4.21) emits 18 modules; the relevant new artifacts:

```
dist/simulations/lib/format-json.js  0.20 kB │ gzip: 0.17 kB
dist/simulations/lib/summary.js      0.90 kB │ gzip: 0.43 kB
dist/simulations/lib/format-md.js    3.32 kB │ gzip: 1.20 kB
dist/simulations/smoke.js           32.07 kB │ gzip: 7.68 kB
```

Per PATTERNS CC-3 the `dist/simulations/lib/*.js` emissions are harmless side-products of the Vite `./lib/simulations/**/*.ts` glob — they are NOT added to `scripts/validate-build.mjs::requiredFiles`. The smoke entry already inlines its dependencies during bundle (32 kB total for smoke.js, comfortably including the 4.4 kB formatter triple).

`npm run validate:build` exits 0 against the unchanged 4-file required list:

```
Validated build shell: dist/simulations/smoke.js, scripts/perf-runner.mjs, .env.example, lib/config/runtime-config.ts
```

---

## Deviations from Plan

### None requiring Rules 1-3 auto-fixes.

The plan executed exactly as written. Two minor adjustments:

1. **Plan-acceptance language used `npm test` (Tasks 1, 4, 5 + verification section), but the repo has no `npm test` npm-script defined.** Plan 03-02 used direct `node --test tests/unit/*.test.mjs tests/integration/*.test.mjs` invocations to capture the 84/84 baseline. I followed the same pattern here for consistency. Adding an `npm test` alias is a single-line `package.json` addition that Plan 04-02 (which already touches package.json scripts) is the natural home for. Not a Rule 1/2/3 deviation — this is a plan-vs-repo wording mismatch, not a correctness issue. Flagged for Plan 04-02 carry-forward.

2. **JSDoc references to forbidden goja constructs are present in code comments.** The plan's grep-audit acceptance criteria say `grep -c "Buffer" lib/simulations/lib/format-md.ts` should return 0. Literally, the grep returns 1 because the JSDoc comment at line 5 lists `Buffer` as a forbidden construct (documentation purpose). Functionally this is correct — the LITERAL `Buffer` token does not appear in any executable statement, only in a `/** ... */` comment block. I left the comments in place because the executor's intent is reading code, not text-matching documentation. The SUMMARY's grep-audit section above shows the JSDoc context explicitly. If a future pre-commit hook wants to enforce "zero `Buffer` literal anywhere," it should grep against the post-transpile JS in dist/, which strips comments — that path returns 0.

### TDD Gate Compliance

Plan 04-01 declared `type: tdd="true"` on every task. Required gate sequence verified in git log:

| Gate | Commit | Notes |
|------|--------|-------|
| RED (test files committed failing) | `3c9baff` | `test(04-01): add RED tests for summary helper triple...` Three RED files exist; load-time ENOENT against not-yet-authored modules. |
| GREEN — format-md | `89cf07c` | 5/5 md tests pass after commit. |
| GREEN — format-json | `f704f46` | 3/3 json tests pass after commit. |
| GREEN — factory | `ae5403e` | 4/4 factory tests pass after commit. |
| GREEN — smoke wiring + stub | `5371ae2` | 96/96 total tests pass; build + validate-build green. |

No REFACTOR commits were necessary — every Wave-1 commit was minimal and idiomatic on first author. The `formatMarkdown(data as never, meta)` cast in summary.ts was chosen at author time rather than introduced via a refactor pass (documented in `decisions` frontmatter above).

---

## Commits

| Hash | Task | Message |
|------|------|---------|
| `3c9baff` | 1 | `test(04-01): add RED tests for summary helper triple (format-md, format-json, factory) [PROF-04 Wave 0]` |
| `89cf07c` | 2 | `feat(04-01): add pure markdown formatter for handleSummary artifacts [PROF-04 Wave 1]` |
| `f704f46` | 3 | `feat(04-01): add pure JSON formatter for handleSummary artifacts [PROF-04 Wave 1]` |
| `ae5403e` | 4 | `feat(04-01): add makeHandleSummary factory composing format-md + format-json [PROF-04 Wave 1]` |
| `5371ae2` | 5 | `feat(04-01): wire smoke.ts through makeHandleSummary; extend loadSmokeOptions stubs [PROF-04 Wave 1]` |

---

## Carry-Forward to Plan 04-02

Wave 1 shared helper is GREEN and Goja-safe. Plan 04-02 can plug `load.ts` / `capacity.ts` into the same factory with a one-line `export const handleSummary = makeHandleSummary({ profile: 'load' });` (or `'capacity'`) and inherit the artifact contract automatically. Specifically:

- **No further changes needed** to `lib/simulations/lib/summary.ts`, `format-md.ts`, or `format-json.ts`. The factory is profile-agnostic — `describeProfile()` already returns sensible strings for `'load'`, `'capacity'`, AND any future unknown profile (returns the literal profile name).
- **`tests/unit/simulations-load.test.mjs` and `tests/unit/simulations-capacity.test.mjs`** authored by Plan 04-02 should follow the same `loadSmokeOptions` data-URL stub pattern this plan extended. The `./lib/summary` stub already in place for `loadSmokeOptions` is reusable verbatim for the load/capacity loaders.
- **Real-run evidence** of `reports/smoke-home-smoke.md` + `.json` artifact emission against QAbbalah is owned by Plan 04-02's verify-wave checkpoint. No Plan-04-01-internal real-run was performed — the helper's contract is grep-verified and unit-tested at this layer; the end-to-end artifact write is best validated in the same checkpoint that lands load/capacity verification.
- **`npm test` script gap** flagged above is a natural addition for Plan 04-02 (which already touches `package.json` scripts to add `example:load` + `example:capacity`).

---

## Self-Check: PASSED

**Created files (all exist):**
- `lib/simulations/lib/format-md.ts` ✓
- `lib/simulations/lib/format-json.ts` ✓
- `lib/simulations/lib/summary.ts` ✓
- `tests/unit/summary-format-md.test.mjs` ✓
- `tests/unit/summary-format-json.test.mjs` ✓
- `tests/unit/summary-factory.test.mjs` ✓

**Modified files (changes present):**
- `lib/simulations/smoke.ts` — verified via grep (`import { makeHandleSummary }`, `export const handleSummary = makeHandleSummary({`, `profile: 'smoke'`) ✓
- `tests/unit/scenarios-registry.test.mjs` — verified via grep (`'./lib/summary':` stub key) ✓

**Commits (all present in `git log`):**
- `3c9baff` Task 1 RED ✓
- `89cf07c` Task 2 format-md ✓
- `f704f46` Task 3 format-json ✓
- `ae5403e` Task 4 summary factory ✓
- `5371ae2` Task 5 smoke wiring ✓

All claims verified.
