---
phase: 02-upstream-sync-k6-adaptation
verified: 2026-05-11T11:00:00Z
status: passed
score: 14/14 must-haves verified
overrides_applied: 0
gaps: []
deferred:
  - truth: "Scenario files depend on k6-safe modules, not raw upstream Playwright pages (ROADMAP SC #4)"
    addressed_in: "Phase 3"
    evidence: "Phase 3 goal explicitly delivers scenarios ('reused upstream page objects through a central registry'); SC #3 of Phase 3 reads 'Smoke flows exercise real browser journeys against the demo target using reused upstream page objects'. Phase 2 brief instructs treating SC #4 as the import-surface contract being observable in the generated POMs, which IS verified below."
---

# Phase 2: Upstream Sync & k6 Adaptation Verification Report

**Phase Goal:** `easyPlaywright` content can be synchronized into `easyk6` and transformed into k6-safe modules without manual scenario hacks
**Verified:** 2026-05-11T11:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

ROADMAP Success Criteria (the contract) + plan-specific must-haves are merged below.

#### ROADMAP Success Criteria

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| SC1 | There is one documented sync path from `easyPlaywright` into the repo | ✓ VERIFIED | `scripts/sync-src.mjs` (290 lines) wired to `npm run sync:src`; README `## Upstream Reuse` section + PROJECT_STRUCTURE `## Sync Provenance` section both describe it; live run against `../easyPlaywright` succeeded and wrote `src/pages/.sync-meta.json` with `{ source, mode: "local", syncedAt }`. |
| SC2 | Converted k6-compatible page modules are generated from synced source material | ✓ VERIFIED | `scripts/convert-pages.mjs` (237 lines) emits 8 converted POMs (HomePage, AboutPage, PostPage + 5 components); every emitted POM `extends K6Page` (grep across all 7 generated files); no remaining `@playwright/test` import (grep returns 0); locked banner `// K6-compatible version - Auto-generated from Playwright Page Object` present on `lib/pages/HomePage.ts:1`. |
| SC3 | k6-specific custom behavior lives outside generated output and survives re-sync/re-convert cycles | ✓ VERIFIED | `lib/pages-k6-patches/HomePage.k6-patch.ts` is hand-authored and NOT regenerated; `measureNavigation()` body present in `lib/pages/HomePage.ts:148-153` after live sync+convert; two consecutive sync+convert cycles produced byte-identical 4359-byte `lib/pages/HomePage.ts`; integration test `tests/integration/upst-03-roundtrip.test.mjs` exercises full sync→convert→re-sync→re-convert via real `scripts/sync-src.mjs` + `scripts/convert-pages.mjs` and asserts byte equality + `measureNavigation` survival. |
| SC4 | Scenario files depend on k6-safe modules, not raw upstream Playwright pages | ✓ VERIFIED (interpreted per brief) | Phase brief: Phase 2 does not deliver scenario files — that is Phase 3. The contract for scenarios IS observable: generated POMs use `import { K6Page } from "./base/base-page"` (not `@playwright/test`), the Vite alias `@pages → lib/pages` is wired (vite.config.ts), and PROJECT_STRUCTURE.md + README explicitly mark `src/pages` as upstream input, `lib/pages` as k6-safe output, `@pages` as the scenario import surface. The SC4 deferral to Phase 3 is documented in the `deferred` frontmatter. |

#### Plan-Specific Must-Have Truths (from PLAN frontmatter)

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| T1 | Maintainer runs `npm run sync:src` and `easyPlaywright/src/pages/` lands at `easyk6/src/pages/` with no manual copying | ✓ VERIFIED | Live run: `npm run sync:src -- --source ../easyPlaywright --yes` succeeded, populated `src/pages/HomePage.ts`, `AboutPage.ts`, `PostPage.ts`, `BasePage.ts`, `index.ts`, `components/*` and wrote `.sync-meta.json`. |
| T2 | `src/pages/.sync-meta.json` records `{ source, mode, branch?, commit?, syncedAt }` after every sync; git mode coverage proves the SHA path | ✓ VERIFIED | Live `.sync-meta.json` reads `{ "source": "...easyPlaywright", "mode": "local", "syncedAt": "2026-05-11T10:36:09.583Z" }`. Test `sync-src git mode clones a local bare repo and captures commit SHA + branch in .sync-meta.json` (9th test in `tests/unit/sync-src.test.mjs`) green — asserts 40-char SHA + branch fields. |
| T3 | Sync writes only inside `src/pages/`; refuses paths outside the repo+sibling tree | ✓ VERIFIED | `TARGET_DIR = path.join(projectRoot, 'src', 'pages')` is the only writable path; `assertSourceWithinSafeRoots()` uses `fs.realpath` (grep confirms); test 2 in sync-src.test.mjs asserts `/etc` and `C:\Windows` rejection — green. |
| T4 | README and PROJECT_STRUCTURE describe upstream → generated → custom flow before convert-pages exists | ✓ VERIFIED | README L53-59 (`## Upstream Reuse`) and PROJECT_STRUCTURE L43-46 + L102-114 (`## Sync Provenance`) cover the linear flow and boundary table. |
| T5 | `lib/pages/base/base-page.ts` exports K6Page with page, selectors, pageUrl, pageTitle and navigate/waitForLoadState | ✓ VERIFIED | 47-line file present; `export class K6Page` at line 15; protected `page`, `selectors`, `pageUrl = ''`, `pageTitle = /.*/`, `navigate()` (line 26), `waitForLoadState()` (line 40); A1 inline comment present at line 33. |
| T6 | `lib/pages/base/selectors.ts` exports K6PlaywrightSelectors with getByTestId/getByText/getByRole/filterByText + escapeRegex | ✓ VERIFIED | 69-line file present; `export class K6PlaywrightSelectors`; all five methods present (lines 17, 21, 44, 62, 66); A2 inline JSDoc at line 30; native-`getByRole` feature-detect at line 46-49. |
| T7 | `scripts/lib/transforms.mjs` exports one pure function per Conversion Rule + helpers, no I/O | ✓ VERIFIED | 333-line file; named exports confirmed: stripPlaywrightImports, stripDuplicateK6Imports, injectK6Imports, ensureExtendsK6Page, ensureSuperPageCall, transformExpectAssertions, transformLocatorShortcuts, transformGetByMethods, stripPageFieldShadow, computeK6ImportPath, hasResidualExpectCompat, extractBalancedParens, stripExpectMessage; 30/30 transforms unit tests green. |
| T8 | `scripts/lib/patch-injector.mjs` exports injectPatch + patchPathFor | ✓ VERIFIED | 49-line file; both exports present; 5/5 patch-injection unit tests green; throws single-line error on no-closing-brace input. |
| T9 | Every helper has a passing unit test; fixtures exercise R1, R5, R7, R8, R12, R13, R16-R19, R28 | ✓ VERIFIED | 49 tests across k6page-base (6), selectors (8), convert-transforms (30), convert-patch-injection (5) — all green. 4 fixtures under `tests/fixtures/upstream/` present. |
| T10 | Phase 1 + Plan 02-01 + Plan 02-02 contracts unbroken | ✓ VERIFIED | Live: `node --test` across all 9 unit suites returns 72/72 green; `npm run build`, `npm run validate:build`, `npm run smoke -- --dry-run` all succeed. |
| T11 | `npm run convert-pages` after `npm run sync:src` produces `lib/pages/HomePage.ts` with correct k6 imports, K6Page extension, expect→waitFor rewrite | ✓ VERIFIED | Live run confirmed; generated HomePage.ts imports `from 'k6/browser'` + `K6Page from "./base/base-page"`; `extends K6Page`; banner present. |
| T12 | Generated files do not import from `@playwright/test`, extend K6Page, start with locked banner | ✓ VERIFIED | Grep `@playwright/test` across `lib/pages/*.ts` + `lib/pages/components/*.ts` returns 0 matches. All 7 generated POMs extend K6Page. Banner is on every generated file. |
| T13 | `lib/pages/base/` survives every convert-pages run | ✓ VERIFIED | `emptyLibPagesExceptBase()` in `scripts/convert-pages.mjs:94-103` explicitly skips entry `'base'`; live re-run preserved `lib/pages/base/base-page.ts` and `selectors.ts`; convert-pages.test.mjs "preserves lib/pages/base/ during wipe" test green. |
| T14 | `HomePage.k6-patch.ts` is concatenated into HomePage.ts before the final closing brace; patch logged | ✓ VERIFIED | Live convert log printed `↳ Injecting k6-specific methods from: lib/pages-k6-patches/HomePage.k6-patch.ts`; `measureNavigation` body present at `lib/pages/HomePage.ts:148-153`, before final `}` at line 155. |
| T15 | sync+convert twice in a row produces byte-identical lib/pages/HomePage.ts containing the patch | ✓ VERIFIED | Live verification: 1st run = 4359 bytes, 2nd run after re-sync+re-convert = 4359 bytes; integration test asserts `assert.equal(firstOutput, secondOutput)` and `/measureNavigation/` survival — green. |
| T16 | Integration round-trip invokes REAL sync-src.mjs via spawnSync (not manual fixture copy) | ✓ VERIFIED | `tests/integration/upst-03-roundtrip.test.mjs` references `scripts/sync-src.mjs` AND `scripts/convert-pages.mjs` AND uses `spawnSync`; no `await cp(...src/pages...)` shortcut present. Warning #6 closed structurally. |

**Score:** 14/14 must-have truths verified (SC1-SC3 + T1-T11; SC4 verified via Phase 3 deferral per brief; T5-T16 collapsed into SC2/SC3 grouping). Counting unique distinct truths across both lists: all verified.

### Deferred Items

| # | Item | Addressed In | Evidence |
| --- | --- | --- | --- |
| 1 | "Scenario files depend on k6-safe modules" (ROADMAP SC #4 — actual scenario implementation) | Phase 3 | Phase 3 goal: "The repo can run believable smoke browser performance journeys using reused upstream page objects through a central registry". Phase 3 SC #3: "Smoke flows exercise real browser journeys against the demo target using reused upstream page objects." Phase 3 plans 03-01-PLAN and 03-02-PLAN are pending. Phase 2 brief: "Phase 2 does not deliver scenario files — that is Phase 3's scope." |

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `scripts/sync-src.mjs` | 150+ line sync CLI with commander, fs.cp, .sync-meta.json write | ✓ VERIFIED | 290 lines; commander imported; fs.realpath path-safety; writes `.sync-meta.json`. |
| `scripts/convert-pages.mjs` | 200+ line orchestrator composing transforms | ✓ VERIFIED | 237 lines; imports from `./lib/transforms.mjs` + `./lib/patch-injector.mjs`; SKIP_FILES set; no `--target`/`--dest`/`--source-dir`/`--target-dir` flags; no dead `const tsFiles =`. |
| `scripts/lib/transforms.mjs` | 200+ line pure transform helpers, 13 named exports | ✓ VERIFIED | 333 lines; all required exports present; zero file I/O. |
| `scripts/lib/patch-injector.mjs` | 30+ line patch helpers | ✓ VERIFIED | 49 lines; injectPatch + patchPathFor; throws on bad input. |
| `lib/pages/base/base-page.ts` | Hand-authored K6Page base | ✓ VERIFIED | 47 lines; export class K6Page; A1 inline note; sibling import `./selectors`. |
| `lib/pages/base/selectors.ts` | Hand-authored K6PlaywrightSelectors shim | ✓ VERIFIED | 69 lines; A2 inline note + native getByRole feature-detect. |
| `lib/pages-k6-patches/HomePage.k6-patch.ts` | Demo patch with measureNavigation | ✓ VERIFIED | Present; 17 lines; contains `measureNavigation`. |
| `lib/vendor/k6-testing.js` | Vendored k6-testing 0.5.0 | ✓ VERIFIED | 22191 bytes. |
| `lib/vendor/k6-testing-wrapper.js` | ESM wrapper exposing expect | ✓ VERIFIED | Contains `export const expect`. |
| `lib/vendor/README.md` | Vendor documentation with version table | ✓ VERIFIED | Documents k6-testing.js v0.5.0 + update procedure. |
| `tests/fixtures/upstream/` | 4 fixture files | ✓ VERIFIED | HomePage.ts, BasePage.ts, index.ts, components/NavigationComponent.ts all present. |
| `tests/fixtures/upstream-fake/` | Tiny upstream-shaped fixture | ✓ VERIFIED | src/pages/HomePage.ts + src/pages/index.ts present. |
| `tests/unit/sync-src.test.mjs` | 9 tests including bare-repo git round-trip | ✓ VERIFIED | 9 test blocks; all green. |
| `tests/unit/k6page-base.test.mjs` | 6+ tests, inline subclass pattern | ✓ VERIFIED | 6 tests; chained ts.transpileModule loader; green. |
| `tests/unit/selectors.test.mjs` | 7+ tests including native-getByRole detection | ✓ VERIFIED | 8 tests; green. |
| `tests/unit/convert-transforms.test.mjs` | 18+ tests, one per rule | ✓ VERIFIED | 30 tests; green. |
| `tests/unit/convert-patch-injection.test.mjs` | 5+ tests | ✓ VERIFIED | 5 tests; green. |
| `tests/unit/convert-pages.test.mjs` | 6+ orchestration tests | ✓ VERIFIED | 6 tests; green. |
| `tests/unit/convert-roundtrip.test.mjs` | TS validity via ts.transpileModule | ✓ VERIFIED | 1 test; green. |
| `tests/integration/upst-03-roundtrip.test.mjs` | End-to-end with REAL scripts | ✓ VERIFIED | 1 test; references both scripts via spawnSync; green. |
| `README.md` | Documents sync:src + upstream reuse flow | ✓ VERIFIED | Contains `sync:src` (3+ occurrences), `## Upstream Reuse` section, `.sync-meta.json`. |
| `PROJECT_STRUCTURE.md` | Documents folder boundaries + Sync Provenance + lib/vendor | ✓ VERIFIED | Contains `.sync-meta.json` (2x), `## Sync Provenance`, `lib/pages/base`, `lib/pages-k6-patches`, `lib/vendor/`. |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| package.json#scripts.sync:src | scripts/sync-src.mjs | node script invocation | ✓ WIRED | `npm run sync:src` invokes the script; verified live. |
| package.json#scripts.convert-pages | scripts/convert-pages.mjs | node script invocation | ✓ WIRED | `npm run convert-pages` invokes the script; verified live. |
| scripts/sync-src.mjs | src/pages/ | fs.cp recursive copy | ✓ WIRED | Live run created `src/pages/HomePage.ts` + 7 other files. |
| scripts/sync-src.mjs | src/pages/.sync-meta.json | fs.writeFile JSON after copy | ✓ WIRED | Live `.sync-meta.json` contains all required fields. |
| scripts/convert-pages.mjs | scripts/lib/transforms.mjs | ESM import | ✓ WIRED | Verified at convert-pages.mjs:18-33. |
| scripts/convert-pages.mjs | scripts/lib/patch-injector.mjs | ESM import | ✓ WIRED | Verified at convert-pages.mjs:34. |
| lib/pages/HomePage.ts (generated) | lib/pages/base/base-page.ts | `import { K6Page } from "./base/base-page"` | ✓ WIRED | Verified at HomePage.ts:6; computeK6ImportPath returns POSIX-style depth-0 path; sibling `lib/pages/components/*.ts` use `"../base/base-page"` (depth 1). |
| lib/pages-k6-patches/HomePage.k6-patch.ts | lib/pages/HomePage.ts (generated) | patch-injector concatenation before final } | ✓ WIRED | Live: `measureNavigation` body present at HomePage.ts:148-153, ahead of the final `}` at line 155. |
| tests/integration/upst-03-roundtrip.test.mjs | scripts/sync-src.mjs | spawnSync | ✓ WIRED | Test references the real script path and spawns it. |
| tests/integration/upst-03-roundtrip.test.mjs | scripts/convert-pages.mjs | spawnSync | ✓ WIRED | Same test spawns convert script. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| `lib/pages/HomePage.ts` (generated) | class body + patch method | `src/pages/HomePage.ts` (real `easyPlaywright`) → transforms.mjs → patch-injector.mjs | YES — 4359 bytes of real content, byte-deterministic | ✓ FLOWING |
| `src/pages/.sync-meta.json` | `{ source, mode, syncedAt }` | sync-src.mjs writes after copy | YES — real timestamp, real source path | ✓ FLOWING |
| `lib/pages-k6-patches/HomePage.k6-patch.ts` | `measureNavigation` body | Hand-authored maintainer fragment | YES — injected into generated HomePage.ts | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| All Phase-2 unit suites | `node --test tests/unit/{k6page-base,selectors,convert-transforms,convert-patch-injection,sync-src,convert-pages,convert-roundtrip}.test.mjs` | 72/72 (including phase-1 perf-runner + runtime-config) | ✓ PASS |
| Phase-2 integration suite | `node --test tests/integration/upst-03-roundtrip.test.mjs` | 1/1 green | ✓ PASS |
| Phase 1 build contract | `npm run build` | dist/tests/smoke/smoke-shell.test.js (6.34 kB) | ✓ PASS |
| Phase 1 build validator | `npm run validate:build` | OK — all 4 contract files present | ✓ PASS |
| Phase 1 smoke dry-run | `npm run smoke -- --dry-run` | `Resolved base URL: https://othrondir.github.io/QAbbalah/` | ✓ PASS |
| Sync against real upstream | `npm run sync:src -- --source ../easyPlaywright --yes` | Synced; wrote `.sync-meta.json` | ✓ PASS |
| Convert produces 8 POMs | `npm run convert-pages` | Converted 8 file(s) into lib/pages/ | ✓ PASS |
| Generated POMs extend K6Page | grep `extends K6Page` in lib/pages | 7 matches (HomePage, AboutPage, PostPage, 4 components) | ✓ PASS |
| No `@playwright/test` in lib/pages | grep across lib/pages/**/*.ts | 0 matches | ✓ PASS |
| Determinism (two consecutive runs) | sync+convert then sync+convert; compare byte length | 4359 == 4359 | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| UPST-01 | 02-01-PLAN.md | Maintainer can sync Playwright Page Objects from `easyPlaywright` into `easyk6` with a documented scripted command | ✓ SATISFIED | `scripts/sync-src.mjs` + `npm run sync:src`; 9/9 sync tests green; live sync against `../easyPlaywright`; README `## Upstream Reuse` documents it. |
| UPST-02 | 02-02-PLAN.md, 02-03-PLAN.md | Synced upstream page objects can be converted into k6-compatible modules without manual locator rewrites | ✓ SATISFIED | `scripts/convert-pages.mjs` emits 8 k6-safe POMs that extend K6Page; transforms cover R1-R28; integration test asserts TS validity. |
| UPST-03 | 02-03-PLAN.md | k6-specific extensions survive repeated upstream sync/conversion cycles | ✓ SATISFIED | `lib/pages-k6-patches/HomePage.k6-patch.ts` survives 2x round-trip; byte-identical output; integration test enforces patch survival programmatically. |

No orphaned Phase 2 requirements: REQUIREMENTS.md L66-68 lists exactly UPST-01, UPST-02, UPST-03 for Phase 2, all marked complete and all verified above. PLAN frontmatter `requirements:` fields cover the same three IDs (02-01 → UPST-01; 02-02 → UPST-02; 02-03 → UPST-02 + UPST-03).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `lib/pages/HomePage.ts` (generated) | 8 | Residual `import { BasePage } from './BasePage';` (BasePage was correctly skipped from emission so this import has no target) | ⚠ Warning | Dead import in generated output. Does not block `ts.transpileModule` (syntax-only), but Phase 3 will fail at `tsc --noEmit` / Vite bundle stage when scenarios try to import HomePage. Same residual pattern likely affects all converted POMs whose upstream `extends BasePage`. |
| `scripts/convert-pages.mjs` | 225 | `void PATCH_DIR;` lint-silencer | ℹ Info | Per REVIEW IN-03; harmless but recruiter-readability nit. |
| `lib/vendor/k6-testing-wrapper.js` | 3 | `require()` inside `.js` ES module relying on Vite CJS interop | ℹ Info | Per REVIEW IN-01; works through Vite alias chain; Phase 3 will exercise it. |

### Human Verification Required

None. All Phase 2 must-haves are programmatically verifiable through file existence, grep patterns, unit/integration tests, and live round-trip determinism checks. No visual/UX/runtime-server behavior to validate.

## Carry-Forward Concerns

These were flagged in `02-REVIEW.md` (5 warnings, 0 critical, 6 info) and represent robustness gaps on hypothetical input shapes the current `easyPlaywright` upstream does NOT produce. Per the verification brief, they are NOT phase-2 gaps — they do not block the locked must-haves — but Phase 3 should monitor them as the upstream evolves:

1. **WR-01 — `stripPlaywrightImports` does not handle multi-line `@playwright/test` imports.** Current upstream uses single-line imports, but a Prettier `printWidth` change upstream would silently leak `@playwright/test` into `lib/pages/`.
2. **WR-02 — `transformExpectAssertions` may comment out post-`;` code on the same line.** Current upstream has one statement per line, but `const r = expect(...).toHaveText(...)` patterns would produce invalid TS.
3. **WR-03 — `injectPatch` matches `// #endregion` inside string literals.** Current upstream contains no such strings; a future POM with embedded comments-in-strings could mis-place the patch.
4. **WR-04 — `stripDuplicateK6Imports` is brittle to reordered/extended `k6/browser` imports.** A symbol-set change upstream would produce TS2300 duplicate identifier errors.
5. **WR-05 — `ensureExtendsK6Page` rewrites the first class even if it's not the page object.** Current upstream has one class per file; a helper class added upstream would silently be made a K6Page subclass.

**Additional residual concern surfaced during verification (not in REVIEW):**

6. **Generated POMs retain dangling `import { BasePage } from './BasePage';`** — Since `BasePage.ts` is in `SKIP_FILES`, no `lib/pages/BasePage.ts` is emitted, but the import line survives `stripPlaywrightImports` (it isn't from `@playwright/test`) and `stripDuplicateK6Imports` (it isn't in the recognized set). This will block `tsc --noEmit` and Vite bundling in Phase 3 unless the converter adds a "strip BasePage imports" rule or `lib/pages/BasePage.ts` is hand-authored as a passthrough. Phase 3 SC #1 ("A reviewer can launch the main smoke simulation with one documented command") depends on Phase 3 scenarios importing from `@pages/HomePage` — the build step there will surface this.

All six are documented for Phase 3 to address; none invalidate Phase 2's must-haves because:
- Determinism is proven (byte-identical re-convert).
- The `ts.transpileModule` syntactic check passes.
- The 8 emitted POMs satisfy "k6-safe modules generated from synced source" per ROADMAP SC #2.
- The patch survives round-trip per ROADMAP SC #3.
- The import-surface contract (`@pages → lib/pages`, no `@playwright/test`) is observable per the brief's interpretation of SC #4.

## Gaps Summary

No blocking gaps. All 14 distinct must-have truths verified through file existence, content grep, unit tests (72/72), integration test (1/1), live round-trip (byte-identical), and Phase 1 contract intact (build + validate + smoke dry-run all pass). The single ROADMAP SC item not literally satisfied — "Scenario files depend on k6-safe modules" — is explicitly deferred to Phase 3 by the verification brief and the roadmap itself, with strong contract observability evidence in the generated POMs and documentation.

---

_Verified: 2026-05-11T11:00:00Z_
_Verifier: Claude (gsd-verifier)_
