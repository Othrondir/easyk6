---
phase: 02-upstream-sync-k6-adaptation
plan: 03
subsystem: tooling
tags: [convert-pages, orchestrator, integration-test, vendor, k6-testing, patch-injection, round-trip, byte-determinism]

# Dependency graph
requires:
  - phase: 02-upstream-sync-k6-adaptation
    plan: 01
    provides: scripts/sync-src.mjs CLI + tests/fixtures/upstream/ root + Phase 1 contract baseline
  - phase: 02-upstream-sync-k6-adaptation
    plan: 02
    provides: scripts/lib/transforms.mjs + scripts/lib/patch-injector.mjs + lib/pages/base/* + tests/fixtures/upstream/* fixture corpus
provides:
  - Real `scripts/convert-pages.mjs` (238 lines) composing the 02-02 helpers into a deterministic 9-stage pipeline
  - Vendored `lib/vendor/k6-testing.js` (22191 bytes, version 0.5.0) + `lib/vendor/k6-testing-wrapper.js` (10 lines) + `lib/vendor/README.md` (30 lines, version table + update procedure)
  - Demonstration `lib/pages-k6-patches/HomePage.k6-patch.ts` (17 lines, exposes `measureNavigation()`)
  - Wave 0 + integration test trio: `tests/unit/convert-pages.test.mjs` (6 tests), `tests/unit/convert-roundtrip.test.mjs` (1 test), `tests/integration/upst-03-roundtrip.test.mjs` (1 test)
  - `PROJECT_STRUCTURE.md` update documenting `lib/vendor/` and the real `convert-pages.mjs`
affects: [03-smoke-scenarios-supported-execution]

# Tech tracking
tech-stack:
  added: []  # No new prod/dev deps; existing commander 11.x + typescript 5.9.x + Node 22 builtins
  patterns:
    - "process.cwd()-based projectRoot in scripts/convert-pages.mjs (mirrors the Plan 02-01 sync-src.mjs pattern) so spawnSync tests can drive the script with `cwd:<tempdir>` and ephemeral tempdirs become the project root."
    - "Pipeline composition: pure-function helpers from scripts/lib/* run in a locked 9-stage order; orchestrator stays under 240 lines and has zero rule logic of its own."
    - "Hardcoded wipe target (`lib/pages/` minus `base/`) with no `--target-dir` flag (T-V12-01 mitigation) — same shape as Plan 02-01's `--target`-less sync-src.mjs."
    - "Per-file try/catch with non-zero overall exit code (D-35): unfixable upstream POMs fail one entry but the converter still emits every successful sibling."
    - "Integration test invokes the REAL scripts/sync-src.mjs + scripts/convert-pages.mjs via spawnSync (no manual fixture re-copy) using ephemeral sibling-tempdir as the upstream — closes warning #6 structurally."

key-files:
  created:
    - lib/vendor/k6-testing.js
    - lib/vendor/k6-testing-wrapper.js
    - lib/vendor/README.md
    - lib/pages-k6-patches/HomePage.k6-patch.ts
    - tests/unit/convert-pages.test.mjs
    - tests/unit/convert-roundtrip.test.mjs
    - tests/integration/upst-03-roundtrip.test.mjs
    - .planning/phases/02-upstream-sync-k6-adaptation/02-03-SUMMARY.md
    - .planning/phases/02-upstream-sync-k6-adaptation/deferred-items.md
  modified:
    - scripts/convert-pages.mjs        # placeholder (1 line) -> 238-line orchestrator
    - scripts/lib/transforms.mjs       # Rule-1 deviation: orphan-await/; boundary fix for unsupported-assertion branch
    - PROJECT_STRUCTURE.md             # lib/vendor/ row + real description of convert-pages.mjs

key-decisions:
  - "Deviation Rule-1: transforms.mjs unsupported-assertion branch now absorbs leading `await `/`return ` and trailing `;` into the commented region, matching ir-perf-k6 convert-to-k6.sh:604-611. Without this, `await expect(this.x).toHaveText('y');` produced invalid TypeScript that failed `convert-roundtrip.test.mjs`. The Plan 02-02 transforms unit suite (30/30) still passes — no rule semantics changed, only the branch's emit shape was widened to cover the surrounding keyword/punctuation."
  - "Per-file error forcing function in convert-pages.test.mjs: pre-create the matching patch entry as a DIRECTORY rather than a file. `existsSync(patchAbs)` returns true for directories so the converter takes the patch branch; `fs.readFile(patchAbs)` then throws `EISDIR`. This is the only reliable trigger because injectK6Imports unconditionally prepends import lines containing `}` — so a `let x = 0;` fixture cannot reach patch-injector's `Cannot locate injection point` throw."
  - "Integration test strategy: spawn the REAL repo scripts (not copies in the tempdir) with `cwd:<tempdir>`. Both Phase 2 scripts derive projectRoot from process.cwd(), so they read/write the tempdir; commander + helper imports resolve from the real repo's node_modules without copying ~100MB. The fake-upstream sits in a sibling tempdir under tmpdir() so sync-src's assertSourceWithinSafeRoots accepts it (both project root and upstream live under the OS tmpdir tree)."
  - "PATCH_DIR is referenced via `void PATCH_DIR` for diagnostics rather than removed — the constant documents the patch-folder convention recruiter-readably, even though the actual lookup goes through `patchPathFor(rel)` + `path.join(projectRoot, ...)`."

patterns-established:
  - "Pattern: convert-pages.mjs is a thin composition layer (~240 lines). Every transform rule lives in scripts/lib/transforms.mjs with its own unit test; every patch-injector decision lives in scripts/lib/patch-injector.mjs. The orchestrator just sequences them and handles file I/O. Anyone debugging a conversion failure starts by isolating the failing rule via its unit test, not by stepping through the orchestrator."
  - "Pattern: an integration test that drives both upstream and downstream scripts via spawnSync against a sibling-tempdir upstream — fully exercises D-26 idempotent sync + D-44 patch survival without touching the developer working tree."
  - "Pattern: directory-as-file forcing function for per-file-error tests — pre-creating a path as a directory where the script expects a file is a deterministic way to trigger `fs.readFile` / `fs.writeFile` errors on every OS."

requirements-completed: [UPST-02, UPST-03]

# Metrics
duration: 18min
completed: 2026-05-11
---

# Phase 02 Plan 03: convert-pages Orchestrator + UPST-03 Round-trip Summary

**Real `npm run convert-pages` lands as a 238-line composition of the 02-02 helpers; `lib/vendor/k6-testing.js` (v0.5.0) + wrapper + README ship; `lib/pages-k6-patches/HomePage.k6-patch.ts` proves patch survival end-to-end; sync→convert→re-sync→re-convert against the real `../easyPlaywright` sibling produces a byte-identical 4361-byte `lib/pages/HomePage.ts` on every run (UPST-03 D-44 acceptance).**

## Performance

- **Duration:** ~18 min (including diagnosis of the orphan-await/; failure mode and the per-file-error forcing-function rewrite)
- **Tasks:** 3 (one drafted into multiple atomic commits)
- **Files created:** 9 (3 vendor + 1 patch + 3 tests + 2 planning docs)
- **Files modified:** 3 (orchestrator placeholder → real, transforms.mjs Rule-1 fix, PROJECT_STRUCTURE.md)

## Accomplishments

- **Orchestrator.** Replaced `scripts/convert-pages.mjs` (Phase 1 placeholder: `console.log('Phase 2 owns this implementation.')`) with the real 238-line Node-port of `ir-perf-k6/config/convert-to-k6.sh`. Composes the 13 named exports from Plan 02-02's `scripts/lib/transforms.mjs` plus the 2 from `scripts/lib/patch-injector.mjs` into a deterministic pipeline. Reads `src/pages/*.ts`, writes k6-safe modules under `lib/pages/` (preserving `lib/pages/base/`), concatenates any `lib/pages-k6-patches/<rel>.k6-patch.ts` fragment before the final closing brace, and emits the locked 3-line banner.
- **Vendor.** Vendored `lib/vendor/k6-testing.js` (22191 bytes, byte-identical copy from `../ir-perf-k6/lib/vendor/k6-testing.js`, version 0.5.0) + 10-line ESM wrapper at `lib/vendor/k6-testing-wrapper.js` (re-exports `expect` from the CommonJS module) + 30-line README documenting the version table and update procedure (RESEARCH A3 locked: NO CDN).
- **Demonstration patch.** `lib/pages-k6-patches/HomePage.k6-patch.ts` ships a 17-line `measureNavigation()` helper that returns timing data — proves the patch-injection mechanism is load-bearing (D-42).
- **Wave 0 + integration tests.** `tests/unit/convert-pages.test.mjs` covers the 6 file-orchestration cases (single-POM conversion + banner, R6 BasePage skip, Pitfall-5 index.ts skip, base/ preservation, Pitfall-10 empty src/pages exit, per-file error tolerance). `tests/unit/convert-roundtrip.test.mjs` runs `ts.createSourceFile` + `ts.transpileModule` against generated HomePage.ts and asserts zero diagnostics. `tests/integration/upst-03-roundtrip.test.mjs` spawns the REAL `scripts/sync-src.mjs` and `scripts/convert-pages.mjs` against an ephemeral sibling-tempdir upstream, runs the full sync→convert→re-sync→re-convert cycle, asserts byte-identical output and patch survival, and confirms the D-43 log line.
- **Documentation.** `PROJECT_STRUCTURE.md` adds the `lib/vendor/` row pointing readers at the vendor README and replaces the "placeholder until the next plan ships" line for `scripts/convert-pages.mjs` with a real one-line description.

## Task Commits

Each task was committed atomically:

1. **Task 1: Wave 0 — author the failing orchestrator + integration test files** — `f56d2cd` (test) — landed before this execution session.
2. **Task 2: Vendor k6-testing locally + ship the demonstration HomePage patch** — `6f2abb0` (feat) — landed before this execution session.
3. **Task 3a (deviation): Close Rule-1 boundary in transformExpectAssertions** — `7598490` (fix) — orphan-await/; absorption in the unsupported-assertion branch.
4. **Task 3b: Refine Wave 0 tests to match orchestrator contract** — `bcf3bfd` (test) — per-file error forcing-function rewrite + integration-test spawn-real-scripts strategy swap.
5. **Task 3c: Implement convert-pages orchestrator + document lib/vendor in PROJECT_STRUCTURE** — `2881d9d` (feat) — the main Task 3 deliverable.

_Plan-metadata commit follows separately to capture this SUMMARY.md and STATE.md / ROADMAP.md / REQUIREMENTS.md updates._

## Final Shape of `scripts/convert-pages.mjs`

- **Lines:** 238 (>=200 required by acceptance criterion).
- **No dead `tsFiles` assignment** (warning #9 closed): grep `const tsFiles =` returns 0; the single `filtered = files.filter(...)` computation flows directly into the loop.
- **Pipeline stage order** (run inside `convertFile`):
  1. `stripPlaywrightImports`
  2. `stripDuplicateK6Imports`
  3. `ensureExtendsK6Page`
  4. `ensureSuperPageCall`
  5. `transformExpectAssertions` (balanced-paren walker; R8-R12)
  6. `transformLocatorShortcuts`
  7. `transformGetByMethods`
  8. `stripPageFieldShadow`
  9. `injectK6Imports` (R3+R4; `includeExpect = hasResidualExpectCompat(content)` after the walker)
  10. `injectPatch` (if `lib/pages-k6-patches/<rel>.k6-patch.ts` exists)
  11. Banner prepend + EOL normalisation back to source style (Pitfall 2)
- **Hardcoded constants** (no flags): `SOURCE_DIR = src/pages`, `TARGET_DIR = lib/pages`, `PATCH_DIR = lib/pages-k6-patches`, `SKIP_FILES = Set(['BasePage.ts', 'index.ts'])`.
- **Wipe step** `emptyLibPagesExceptBase()` skips the entry named `'base'`; everything else under `lib/pages/` is removed recursively before conversion begins.

## Converted POMs on a Real Round-trip (`npm run sync:src -- --source ../easyPlaywright --yes && npm run convert-pages`)

```
[1/8] Converting: AboutPage.ts                     ✓
[2/8] Converting: HomePage.ts                      ✓
  ↳ Injecting k6-specific methods from: lib/pages-k6-patches/HomePage.k6-patch.ts
[3/8] Converting: PostPage.ts                      ✓
[4/8] Converting: components/BlogPostComponent.ts  ✓
[5/8] Converting: components/FooterComponent.ts    ✓
[6/8] Converting: components/index.ts              ✓
[7/8] Converting: components/NavigationComponent.ts ✓
[8/8] Converting: components/ProfileComponent.ts   ✓

✓ Converted 8 file(s) into lib/pages/
```

Note: `components/index.ts` IS converted because `SKIP_FILES` matches only top-level `index.ts` (`path.relative(SOURCE_DIR, srcPath)` for a nested file returns `components${sep}index.ts`, which is not in the Set). The components barrel re-exports component classes — converting it is harmless because the imports it lists already resolve to converted siblings inside `lib/pages/components/`.

Generated `lib/pages/HomePage.ts` (4361 bytes, 156 lines) opens with the locked banner:

```ts
// K6-compatible version - Auto-generated from Playwright Page Object
// Source: src/pages/HomePage.ts
// K6-PATCHES: Includes methods from lib/pages-k6-patches/HomePage.k6-patch.ts

import { Page, Locator } from 'k6/browser';
import { K6Page } from "./base/base-page";
```

The demo patch method appears inside the class scope:

```ts
  async measureNavigation(): Promise<number> {
    const start = Date.now();
    await this.navigate();
    await this.waitForHomePageContent();
    return Date.now() - start;
  }
```

## Wave 0 Test Status

```
node --test tests/unit/convert-pages.test.mjs \
            tests/unit/convert-roundtrip.test.mjs \
            tests/integration/upst-03-roundtrip.test.mjs

# tests 8
# pass 8
# fail 0
# duration_ms ~390
```

8/8 green (6 from `convert-pages.test.mjs`, 1 from `convert-roundtrip.test.mjs`, 1 from `upst-03-roundtrip.test.mjs`).

### Test adjustments made during this execution

- **convert-pages.test.mjs / per-file error.** The original forcing function (pre-creating `lib/pages/AboutPage.ts` as a directory) was wiped by `emptyLibPagesExceptBase`; the interim malformed-source approach (`let x = 0;`) silently produced exit code 0 because `injectK6Imports` unconditionally prepends import lines containing `}`, so `injectPatch` never threw. Final forcing function: ship a valid `BadPage.ts` (cp of HomePage fixture) + a MATCHING patch entry at `lib/pages-k6-patches/BadPage.k6-patch.ts` authored as a DIRECTORY. `existsSync` returns true for directories so the converter takes the patch branch; `fs.readFile(patchAbs)` then throws `EISDIR`, the try/catch increments `errors`, HomePage still emits, and the run exits 1.
- **upst-03-roundtrip.test.mjs / spawn strategy.** Earlier draft copied `scripts/` into the tempdir + pointed `NODE_PATH` at the real `node_modules`. Final draft spawns the REAL repo scripts with `cwd:<tempdir>` — both Phase 2 scripts derive projectRoot from `process.cwd()`, so they read/write the tempdir, while commander + helper imports resolve from the real repo. Materializes the fake upstream as an ephemeral sibling tempdir under `tmpdir()` so `sync-src`'s `assertSourceWithinSafeRoots` (both project root and upstream live under `tmpdir()`) accepts the path.

## Vendor Confirmation (RESEARCH A3 — Locked: NO CDN)

- `lib/vendor/k6-testing.js`: 22191 bytes, version 0.5.0, byte-identical to `../ir-perf-k6/lib/vendor/k6-testing.js`.
- `lib/vendor/k6-testing-wrapper.js`: 10 lines, exposes `export const expect`.
- `lib/vendor/README.md`: 30 lines, version table + update procedure.
- Import path resolution: when residual `// k6-compat: expect` lines remain after the walker, the orchestrator injects `import { expect } from '@lib/vendor/k6-testing-wrapper.js';` — the `@lib` alias is declared at `vite.config.ts:62` (`'@lib': resolve(projectRoot, 'lib')`), so the wrapper resolves through the existing Vite alias chain without any new build-config work.

In the current `../easyPlaywright` round-trip, `hasResidualExpectCompat` returned `false` for every converted POM (no `// k6-compat: expect` lines), so the expect-import was NOT injected anywhere this run. The injection path is exercised by the Plan 02-02 unit test `hasResidualExpectCompat: true when a // k6-compat: expect line exists` (transforms suite, test 29). The vendor files remain in place for the moment the upstream gains `toHaveText`-style assertions on POMs that Phase 3 scenarios depend on.

## Determinism Evidence (UPST-03 D-44)

Two independent verifications:

1. **Manual.** Captured `lib/pages/HomePage.ts` after one `convert-pages` run (4361 bytes), re-ran `npm run convert-pages`, captured again — `node` script confirmed `first === second` and `first.length === 4361`.
2. **Automated.** `tests/integration/upst-03-roundtrip.test.mjs` runs the full sync→convert→re-sync→re-convert cycle against an ephemeral sibling upstream and asserts byte-identical output with `assert.equal(firstOutput, secondOutput, 'sync→convert round-trip must produce byte-identical lib/pages/HomePage.ts on re-run')`. Test passes (1/1 in the integration suite).

The patch method `measureNavigation` survives both cycles — the integration test asserts `assert.match(secondOutput, /measureNavigation/, 'demo patch method must SURVIVE the round-trip (UPST-03 D-44)')`.

## Warning #6 Mitigation Evidence

`tests/integration/upst-03-roundtrip.test.mjs` references:

```
const syncScript    = path.join(projectRoot, 'scripts', 'sync-src.mjs');
const convertScript = path.join(projectRoot, 'scripts', 'convert-pages.mjs');
...
const sync1 = spawnSync(process.execPath, [syncScript, '--source', upstream, '--yes'], ...);
const conv1 = spawnSync(process.execPath, [convertScript], ...);
const sync2 = spawnSync(process.execPath, [syncScript, '--source', upstream, '--yes'], ...);
const conv2 = spawnSync(process.execPath, [convertScript], ...);
```

Both halves of the round-trip invoke the REAL repo scripts (no manual `await cp(...src/pages...)` re-copy anywhere in the test). D-26 idempotent-sync behavior (sync-src wiping + rewriting `.sync-meta.json` on the second pass) is exercised in the same test. Warning #6 is closed structurally — not by inspection but by the assertion that the second-pass output is byte-identical to the first-pass output, which can only be true if sync-src's wipe + cp is deterministic AND convert-pages' transforms are deterministic.

## Phase 1 + Plan 02-01 + Plan 02-02 Contract Confirmation

| Check                            | Command                                                                                                                                                              | Result                                |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Phase 1 + 02-01 + 02-02 unit suites | `node --test tests/unit/{runtime-config,perf-runner,sync-src,k6page-base,selectors,convert-transforms,convert-patch-injection}.test.mjs`                              | 65/65 green                            |
| Wave 0 02-03 unit + integration  | `node --test tests/unit/{convert-pages,convert-roundtrip}.test.mjs tests/integration/upst-03-roundtrip.test.mjs`                                                       | 8/8 green                             |
| Vite build                       | `npm run build`                                                                                                                                                      | OK — `dist/tests/smoke/smoke-shell.test.js` 6.34 kB emitted |
| Build validator                  | `npm run validate:build`                                                                                                                                             | OK                                    |
| Smoke dry-run                    | `npm run smoke -- --dry-run`                                                                                                                                         | OK — `Resolved base URL: https://othrondir.github.io/QAbbalah/` |
| Real round-trip                  | `npm run sync:src -- --source ../easyPlaywright --yes && npm run convert-pages`                                                                                       | Exit 0; 8 files converted, HomePage carries `extends K6Page` + `measureNavigation` + locked banner |
| Determinism                      | Two consecutive `npm run convert-pages` invocations after a fresh sync                                                                                               | byte-identical 4361-byte output       |

Phase 1, Plan 02-01, and Plan 02-02 source files (`lib/config/runtime-config.ts`, `scripts/sync-src.mjs`, `scripts/perf-runner.mjs`, `scripts/lib/patch-injector.mjs`, `lib/pages/base/base-page.ts`, `lib/pages/base/selectors.ts`) were NOT modified by this plan. The only `scripts/lib/*` modification was the documented Rule-1 deviation to `transforms.mjs`.

## Decisions Made

1. **`scripts/convert-pages.mjs` derives `projectRoot` from `process.cwd()`** (mirrors Plan 02-01's sync-src.mjs decision). The script has no upstream-source flag, so there's no path-traversal surface to gate — only the wipe target needs to follow the test driver's cwd. This is what lets `tests/unit/convert-pages.test.mjs` and `tests/integration/upst-03-roundtrip.test.mjs` exercise the REAL script against tempdirs without polluting the developer working tree.

2. **`PATCH_DIR` is referenced as a documentation constant via `void PATCH_DIR`**. The actual patch lookup goes through `patchPathFor(rel)` + `path.join(projectRoot, ...)` so the constant is technically unused for routing — but keeping it visible at the top of the file shows readers at a glance which directory the patch convention lives in. The `void` suppression keeps eslint quiet without removing the recruiter-readable signal.

3. **`commander.exitOverride()` paired with a parse-error catcher** (mirrors Plan 02-01). `--help` / `--version` exit 0 cleanly while genuine flag errors fall through to `main().catch -> exit 1`.

4. **Integration test uses an ephemeral sibling-tempdir upstream**, not the repo's `tests/fixtures/upstream/` directly. Reason: sync-src.mjs's `assertSourceWithinSafeRoots` accepts the real repo's `tests/fixtures/` because the script-location root sits under it. But running the test in CI where the temp project root is under `tmpdir()` and the upstream is also under `tmpdir()` keeps the safety check happy via the parent-tree allowlist, AND removes any coupling between the test and the real fixtures (the test can mutate its upstream freely).

5. **The components barrel `components/index.ts` is converted, not skipped.** `SKIP_FILES = Set(['BasePage.ts', 'index.ts'])` matches by exact relative-path string, so the top-level `index.ts` is skipped while `components/index.ts` (relative path `components${sep}index.ts`) is not in the Set and goes through the pipeline. The component barrel re-exports component classes whose imports already point at converted siblings inside `lib/pages/components/` — the converted barrel works correctly because all its dependencies are converted alongside it.

## Deviations from Plan

### Rule-1 Bug Fix: Orphan `await`/`return ` + trailing `;` in unsupported-assertion branch

**Found during:** Initial test run of `tests/unit/convert-roundtrip.test.mjs` against the existing transforms.mjs (i.e. the version that landed in 02-02 commit `ed04bad`).

**Root-cause failure mode:** The HomePage fixture in `tests/fixtures/upstream/HomePage.ts` contains `await expect(this.mainContent).toHaveText('hi');` (line 27). The unsupported-assertion branch of `transformExpectAssertions` only emitted `// k6-compat: expect(this.mainContent).toHaveText('hi')` — leaving the preceding `await ` keyword orphaned on the previous chunk AND the trailing `;` as a stray statement. The transpiled output looked like:

```ts
    await // k6-compat: expect(this.mainContent).toHaveText('hi')
;
```

`ts.transpileModule` reports parse diagnostics on the orphan `await` expression (line continuation across a comment is a parse error in modern TS targets) AND on the bare `;` (Empty Statement at indentation 0 inside a class body — visually wrong even when it parses). `convert-roundtrip.test.mjs` flagged both, and the integration round-trip emitted broken TS that Phase 3 scenarios would not compile against.

**Fix:** Widened the unsupported-assertion branch to absorb both the leading `await `/`return ` keyword and the trailing `;` into the commented region. The emitted line for the example above is now a single legal comment:

```ts
    // k6-compat: await expect(this.mainContent).toHaveText('hi');
```

This matches the canonical behavior in `ir-perf-k6/config/convert-to-k6.sh:604-611`, which the original Plan 02-02 walker port had simplified away. Specifically:

1. Peel back any `await ` / `return ` (with trailing whitespace) from the last `out` chunk before the `expect(...)` start.
2. After the closing `)` of the assertion method, eat any `\s*;` and append it to the commented region.
3. Advance `i` past the eaten `;` so the walker doesn't re-emit it.

**Why scope creep is justified:** Plan 02-03's `<interfaces>` section explicitly lists `scripts/lib/transforms.mjs` as NOT modified by this plan — but the un-fixed walker emits TypeScript that fails the locked `convert-roundtrip.test.mjs` syntactic-validity check (a Plan 02-03 acceptance criterion). The choice is either to fix the walker (this deviation) or to walk back the Plan 02-03 acceptance criterion. Rule 1 (auto-fix bugs) applies cleanly because the un-fixed walker produces incorrect output that prevents the orchestrator from completing UPST-03 acceptance; the fix preserves all 30 Plan 02-02 transforms unit tests (no rule semantics changed, only the emit shape of the existing branch was widened to cover surrounding tokens).

**Regression-test coverage:**
- `tests/unit/convert-transforms.test.mjs` — all 30 tests still green (Plan 02-02 contract intact; no transform rule semantics changed).
- `tests/unit/convert-roundtrip.test.mjs` — single test now green (was the original failure reporter).
- `tests/integration/upst-03-roundtrip.test.mjs` — fully exercises the fix end-to-end via the real HomePage fixture.

**Files modified:** `scripts/lib/transforms.mjs` (29 added, 2 removed in the unsupported-assertion branch only).

**Committed in:** `7598490` (fix commit, atomic with no other changes).

---

### Test Refinements (Task 1 Follow-ups)

Two adjustments to the Task 1 (`f56d2cd`) scaffold to align the tests with the orchestrator that Task 3 (`2881d9d`) shipped:

1. **convert-pages.test.mjs "per-file error" forcing function.** Documented in Decisions Made #5 above and inline in the commit message of `bcf3bfd`. The new forcing function (patch entry as a directory) reliably triggers `EISDIR` on `fs.readFile(patchAbs)` so the per-file try/catch in convert-pages has a real failure to swallow. The test still asserts exit code != 0, stderr contains `Error converting BadPage.ts`, and the OTHER POM (HomePage) is still emitted to `lib/pages/`.

2. **upst-03-roundtrip.test.mjs spawn-real-scripts strategy.** Documented in Decisions Made #4 above and inline in the commit message of `bcf3bfd`. Eliminates the NODE_PATH dependency and the `cp scripts/` step; both Phase 2 scripts already derive projectRoot from process.cwd() so spawning them with `cwd:<tempdir>` is sufficient. The fake-upstream lives as an ephemeral sibling tempdir.

**Files modified:** `tests/unit/convert-pages.test.mjs`, `tests/integration/upst-03-roundtrip.test.mjs`.

**Committed in:** `bcf3bfd` (test refinements commit, separate from the orchestrator commit).

---

**Total deviations:** 1 Rule-1 fix (orphan-await/; absorption in transforms.mjs) + 2 test refinements (per-file-error forcing function + integration-test spawn strategy). No Rule 2 (missing critical functionality) or Rule 4 (architectural changes) were needed. The deferred `.gitignore` cleanup for synced+generated artifacts is logged in `deferred-items.md` per the SCOPE BOUNDARY rule — not added to this plan because the plan's acceptance criteria do not require it.

## Issues Encountered

None beyond the deviations documented above. The integration test surfaced one initial spawn-strategy mistake (NODE_PATH + cp scripts/ approach) that the Task 1 scaffold had reached for; the simpler "spawn REAL scripts with cwd:<tempdir>" approach was discovered when re-reading the Phase 2-01 SUMMARY note about projectRoot-derivation-from-cwd. Otherwise the plan's `<interfaces>` lock, `<action>` pseudocode, and Plan 02-02's helper exports were detailed enough that the orchestrator went straight through.

## Threat Surface Scan

The plan's `<threat_model>` covers `T-V12-01` (hardcoded wipe target — TARGET_DIR + SKIP_FILES are module constants, no --target flag, base/ explicitly preserved), `T-CONV-01` (DoS on malformed POM — per-file try/catch with non-zero overall exit code per D-35, exercised by the directory-as-patch test), `T-CONV-02` (invalid TS from regex transforms — `convert-roundtrip.test.mjs` calls `ts.transpileModule` with `reportDiagnostics: true` and asserts an empty diagnostics array), `T-INJ-01` (adversarial patch content — accepted: maintainer-authored, ASVS L1), `T-VEND-01` (vendor version drift — `lib/vendor/README.md` documents version 0.5.0 + the update procedure).

No new security-relevant surface was introduced. The orchestrator has zero network I/O, zero subprocess spawning, zero env-var consumption beyond Phase 1's existing dotenv path. The vendored `k6-testing.js` is a byte-identical copy from `ir-perf-k6` (already in production use) — no transformation, no transitive deps.

No threat flags to raise.

## Notes for Phase 3

These observations should carry into Phase 3 (Smoke Scenarios & Supported Execution):

- **`@pages/HomePage` import is now valid** for any scenario file. The Vite alias chain `@pages` → `lib/pages` resolves to the generated HomePage.ts which extends K6Page and exposes `measureNavigation()`. Phase 3 scenarios that need browser-side timing data have a ready entry point.

- **K6Page contract is the surface for scenarios.** Subclasses of K6Page (i.e. every converted POM) inherit:
  - `page: Page` (k6 browser Page)
  - `selectors: K6PlaywrightSelectors` (shim with getByText/getByRole/getByTestId/filterByText)
  - `pageUrl: string` (no-ops `navigate()` when empty)
  - `pageTitle: RegExp | string`
  - `navigate(): Promise<void>` (calls `page.goto(this.pageUrl)` when set)
  - `waitForLoadState(state?): Promise<void>` (feature-detects native API per A1)

  Scenarios should consume these methods, not raw Playwright APIs.

- **`hasResidualExpectCompat` may flip true** once Phase 3 introduces POMs whose upstream uses `toHaveText`/`toHaveCount`/`toBe`-style assertions. When that happens, the orchestrator will inject `import { expect } from '@lib/vendor/k6-testing-wrapper.js';` and the vendored `k6-testing.js` will start carrying load. The vendor README's update procedure is the only path to version bumps — do NOT introduce a CDN dependency (RESEARCH A3 lock).

- **`.gitignore` for synced + generated artifacts** is deferred to a fast follow-up (logged in `.planning/phases/02-upstream-sync-k6-adaptation/deferred-items.md`). Phase 3 should not commit `lib/pages/*.ts` (except `base/**`) or `src/pages/*` since those are regenerable from `npm run sync:src && npm run convert-pages` and the upstream sibling.

- **Reuse the test patterns established here:**
  - Tempdir project root + spawnSync the REAL script (sub-second on Windows + Linux).
  - Directory-as-file forcing function when you need a deterministic `fs.readFile`/`fs.writeFile` error trigger.
  - Ephemeral sibling-tempdir upstream for any integration test that needs to drive sync-src + convert-pages end-to-end.

## Next Phase Readiness

- Phase 3 can write smoke scenarios under `tests/k6/scenarios/` (or wherever the registry lands) that import directly from `@pages/HomePage`, `@pages/AboutPage`, `@pages/PostPage`, and the converted components — no manual locator rewrites needed (UPST-02 satisfied).
- The runner from Phase 1 (`scripts/perf-runner.mjs`) does not need any orchestrator changes; the smoke dry-run path already resolves the base URL from runtime-config and points at the bundled smoke-shell artifact.
- The vendored `k6-testing.js` stays dormant until upstream POMs grow assertions that need it; the import-injection path is already wired and unit-tested.

## Self-Check: PASSED

Verified at execution end:

- `[ -f scripts/convert-pages.mjs ]` → FOUND (238 lines, >=200 required)
- `[ -f lib/vendor/k6-testing.js ]` → FOUND (22191 bytes, >=1000 required)
- `[ -f lib/vendor/k6-testing-wrapper.js ]` → FOUND (10 lines, contains `export const expect`)
- `[ -f lib/vendor/README.md ]` → FOUND (30 lines, contains `k6-testing.js`)
- `[ -f lib/pages-k6-patches/HomePage.k6-patch.ts ]` → FOUND (17 lines, contains `measureNavigation`)
- `[ -f tests/unit/convert-pages.test.mjs ]` → FOUND (6 `test(` blocks, >=6 required)
- `[ -f tests/unit/convert-roundtrip.test.mjs ]` → FOUND (1 `test(` block)
- `[ -f tests/integration/upst-03-roundtrip.test.mjs ]` → FOUND (1 `test(` block; references both `sync-src.mjs` AND `convert-pages.mjs` AND `spawnSync`; does NOT manually re-copy via `await cp(...src/pages...)`)
- `[ -f PROJECT_STRUCTURE.md ]` contains `lib/vendor/` → FOUND
- `scripts/convert-pages.mjs` imports from `./lib/transforms.mjs` and `./lib/patch-injector.mjs` → FOUND
- `scripts/convert-pages.mjs` contains `SKIP_FILES = new Set(['BasePage.ts', 'index.ts'])` → FOUND
- `scripts/convert-pages.mjs` does NOT contain `--source-dir` or `--target-dir` → CONFIRMED (grep returns 0)
- `scripts/convert-pages.mjs` does NOT contain a dead `const tsFiles =` assignment → CONFIRMED (warning #9 closed)
- `git log --oneline | grep 7598490` → FOUND (`fix(02-03): close Rule-1 boundary in transformExpectAssertions ...`)
- `git log --oneline | grep bcf3bfd` → FOUND (`test(02-03): refine Wave 0 tests to match orchestrator contract`)
- `git log --oneline | grep 2881d9d` → FOUND (`feat(02-03): implement convert-pages orchestrator + document lib/vendor in PROJECT_STRUCTURE`)
- `node --test` on the 02-03 Wave 0 + integration suite → 8/8 green
- `node --test` on the Phase 1 + 02-01 + 02-02 contract suite → 65/65 green
- `npm run build && npm run validate:build && npm run smoke -- --dry-run` → all three pass
- `npm run sync:src -- --source ../easyPlaywright --yes && npm run convert-pages` → exits 0, emits 8 files, `lib/pages/HomePage.ts` contains `extends K6Page` + `measureNavigation` + locked banner
- Determinism: two consecutive `convert-pages` runs after a fresh sync produce byte-identical `lib/pages/HomePage.ts` (4361 bytes)

---

*Phase: 02-upstream-sync-k6-adaptation*
*Plan 03 completed: 2026-05-11*
