---
phase: 2
slug: upstream-sync-k6-adaptation
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-08
revised: 2026-05-08
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Revised after checker pass: incorporates blocker #2 (02-02 split into 02-02 + 02-03), blocker #3 (git-mode test added to 02-01), and warnings #6-#9.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node:test` + `node:assert/strict` (Phase 1 baseline) |
| **Config file** | None — `node --test tests/unit/*.test.mjs` |
| **Quick run command** | `node --test tests/unit/sync-src.test.mjs tests/unit/convert-transforms.test.mjs` |
| **Full suite command** | `node --test tests/unit/*.test.mjs && node --test tests/integration/*.test.mjs` |
| **Estimated runtime** | ~5 seconds (unit) + ~10 seconds (integration round-trip) |

---

## Sampling Rate

- **After every task commit:** Run `node --test tests/unit/<changed-file>.test.mjs` (sub-second feedback)
- **After every plan wave:** Run `node --test tests/unit/*.test.mjs && node --test tests/integration/*.test.mjs`
- **Before `/gsd-verify-work`:** Full suite must be green + `npm run build && npm run validate:build` + manual `npm run sync:src && npm run convert-pages` round-trip
- **Max feedback latency:** ~15 seconds (full suite)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | UPST-01 | T-V5-01 | Reject `--source` with path traversal; resolve via `fs.realpath`; refuse wipe outside project root | unit | `node --test tests/unit/sync-src.test.mjs` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | UPST-01 | — | Local-mode copy: clears `src/pages/`, copies upstream `src/pages/`, writes `.sync-meta.json` | integration (tmp dirs) | `node --test tests/unit/sync-src.test.mjs` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 1 | UPST-01 | — | Git-mode clone end-to-end via local `file://` bare repo: `--repo` + `--branch`, depth=1, copies upstream `src/pages/`, captures 40-char commit SHA in `.sync-meta.json`. **Test 9 of `sync-src.test.mjs` per blocker #3.** Skips with `t.skip()` if git is unavailable. | integration (local bare repo) | `node --test tests/unit/sync-src.test.mjs` | ❌ W0 | ⬜ pending |
| 02-01-04 | 01 | 1 | UPST-01 | T-V12-01 | Wipe target hardcoded to `src/pages/` (no `--target` flag accepted); prompt before wipe; `--yes`/`CI=1` skip | integration (spawn child) | `node --test tests/unit/sync-src.test.mjs` | ❌ W0 | ⬜ pending |
| 02-01-05 | 01 | 1 | UPST-01 | — | `.sync-meta.json` shape: `{source, mode, branch?, commit?, syncedAt}`; correct fields per mode | unit | `node --test tests/unit/sync-src.test.mjs` | ❌ W0 | ⬜ pending |
| 02-01-06 | 01 | 1 | UPST-01 | — | Folder-boundary docs: `PROJECT_STRUCTURE.md` + README explain upstream→generated→custom flow | manual | `grep -E "src/pages\|lib/pages\|lib/pages-k6-patches" PROJECT_STRUCTURE.md README.md` | ✓ exists (Phase 1) | ⬜ pending |
| 02-02-01 | 02 | 2 | UPST-02 | — | `K6Page` base class: holds `Page`, exposes `selectors`, `navigate(url)`, mirrors ir-perf contract | unit | `node --test tests/unit/k6page-base.test.mjs` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 2 | UPST-02 | — | Selector shim (`getByText`/`getByRole`/`getByTestId`) over k6 locators, with native-`getByRole` feature-detect (warning #8) | unit | `node --test tests/unit/selectors.test.mjs` | ❌ W0 | ⬜ pending |
| 02-02-03 | 02 | 2 | UPST-02 | — | Each transform rule (R1, R2, R3, R5, R7, R8-R12, R13-R15, R16-R19, R28) produces expected output | unit (pure functions) | `node --test tests/unit/convert-transforms.test.mjs` | ❌ W0 | ⬜ pending |
| 02-02-04 | 02 | 2 | UPST-02 | — | Balanced-paren walker handles nested `expect(this.x.filter({hasText: y})).toBeVisible()` | unit | `node --test tests/unit/convert-transforms.test.mjs` | ❌ W0 | ⬜ pending |
| 02-02-09 | 02 | 2 | UPST-03 | — | Patch injection: when `// #endregion` exists, content concatenated before it | unit | `node --test tests/unit/convert-patch-injection.test.mjs` | ❌ W0 | ⬜ pending |
| 02-02-10 | 02 | 2 | UPST-03 | — | Patch injection: when no `// #endregion`, content injected before final `}` of class | unit (easyPlaywright-shaped fixture) | `node --test tests/unit/convert-patch-injection.test.mjs` | ❌ W0 | ⬜ pending |
| 02-03-05 | 03 | 3 | UPST-02 | — | `BasePage.ts` and `index.ts` skipped during conversion | unit | `node --test tests/unit/convert-pages.test.mjs` | ❌ W0 | ⬜ pending |
| 02-03-06 | 03 | 3 | UPST-02 | — | `lib/pages/base/` preserved during convert wipe | integration | `node --test tests/unit/convert-pages.test.mjs` | ❌ W0 | ⬜ pending |
| 02-03-07 | 03 | 3 | UPST-02 | — | Per-file error doesn't abort run; exit code non-zero if any file failed | integration | `node --test tests/unit/convert-pages.test.mjs` | ❌ W0 | ⬜ pending |
| 02-03-08 | 03 | 3 | UPST-02 | — | Round-trip: real `easyPlaywright/HomePage.ts` → converter → output passes `ts.transpileModule` syntax check | integration | `node --test tests/unit/convert-roundtrip.test.mjs` | ❌ W0 | ⬜ pending |
| 02-03-11 | 03 | 3 | UPST-03 | — | Demo `HomePage` patch ships in `lib/pages-k6-patches/HomePage.k6-patch.ts`; injection logged | integration | `node --test tests/integration/upst-03-roundtrip.test.mjs` | ❌ W0 | ⬜ pending |
| 02-03-12 | 03 | 3 | UPST-03 | — | Patch survives full sync→convert round-trip via REAL `scripts/sync-src.mjs` invoked through `spawnSync` (warning #6) | integration | `node --test tests/integration/upst-03-roundtrip.test.mjs` | ❌ W0 | ⬜ pending |
| 02-03-13 | 03 | 3 | UPST-03 | — | Re-running real-script sync→convert with existing patch produces byte-identical output (deterministic) | integration | `node --test tests/integration/upst-03-roundtrip.test.mjs` | ❌ W0 | ⬜ pending |
| (Phase 1 contract) | — | — | BUILD-01/02 | — | Phase 1 build still works after Phase 2 lands | smoke | `npm run build && npm run validate:build` | ✓ exists | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/sync-src.test.mjs` — covers UPST-01 (9 sub-cases including the new git-mode bare-repo round-trip per blocker #3)
- [ ] `tests/unit/k6page-base.test.mjs` — covers K6Page contract (constructor, navigate, selectors property) using **inline TestPage class** (no separate fixture file per warning #7)
- [ ] `tests/unit/selectors.test.mjs` — covers selector shim including the native-`getByRole` feature-detect path (warning #8)
- [ ] `tests/unit/convert-transforms.test.mjs` — covers UPST-02 transform rules (one test per rule R1, R2, R3, R5, R7, R8, R10, R12, R13, R14, R15, R16, R17, R19, R28 + walker corner cases)
- [ ] `tests/unit/convert-pages.test.mjs` — covers UPST-02 file-orchestration behaviors (skip BasePage.ts/index.ts, preserve base/, error handling)
- [ ] `tests/unit/convert-patch-injection.test.mjs` — covers UPST-03 injection algorithm (primary `// #endregion` path + fallback to final `}`)
- [ ] `tests/unit/convert-roundtrip.test.mjs` — covers UPST-02 real-fixture round-trip via `ts.transpileModule` syntax check
- [ ] `tests/integration/upst-03-roundtrip.test.mjs` — covers UPST-03 acceptance using REAL `scripts/sync-src.mjs` via `spawnSync` (warning #6); asserts patched method survives + byte-level determinism
- [ ] `tests/fixtures/upstream/*.ts` — minimal Playwright POM fixtures (HomePage, BasePage, index, components/NavigationComponent) under `tests/fixtures/upstream/` (path consolidated from earlier `upstream-fixture/` and `upstream-fake/` per split)

**Framework install:** None needed — `node:test` is built into Node 22. `typescript` already installed for module loading / `tsc --noEmit`.

**Note on per-plan ownership after the split (blocker #2):**
- **Plan 02-02 (helpers + tests):** owns `k6page-base.test.mjs`, `selectors.test.mjs`, `convert-transforms.test.mjs`, `convert-patch-injection.test.mjs`, the four upstream fixtures, and the K6Page/selectors/transforms/patch-injector source files.
- **Plan 02-03 (orchestrator + integration):** owns `convert-pages.test.mjs`, `convert-roundtrip.test.mjs`, `upst-03-roundtrip.test.mjs`, the orchestrator, the vendored k6-testing files, the demo HomePage patch, and the PROJECT_STRUCTURE.md update.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Recruiter can read `scripts/convert-pages.mjs` and identify conversion rules without running it | UPST-02 (recruiter-facing) | Subjective readability; comment quality | Open file, scan for transform-group comments (e.g., "// expect → waitFor"), confirm each transform group is labeled |
| README quickstart reads `sync:src` → `convert-pages` → `smoke` linearly | UPST-01 (recruiter-facing) | Narrative flow | Read README quickstart section; confirm three commands appear in order with explanations |
| `.sync-meta.json` is human-readable at a glance | UPST-01 | Glanceability | `cat src/pages/.sync-meta.json` shows source path, mode, timestamp clearly |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (gap closed by blocker #3 fix — git-mode test added)
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify *(stays unchecked until Wave 0 executes)*
- [ ] Wave 0 covers all MISSING references *(stays unchecked until Wave 0 executes)*
- [x] No watch-mode flags
- [ ] Feedback latency < 15s *(stays unchecked until /gsd-verify-work measures the full suite)*
- [x] `nyquist_compliant: true` set in frontmatter

**Approval status:** **draft** — flips to **approved** post-execution once Wave 0 tests are written and green for all three plans (02-01, 02-02, 02-03). The unchecked sign-off boxes stay unchecked until `/gsd-verify-work` runs the full suite end-to-end.

---

## Revision History

| Date | Change | Reason |
|------|--------|--------|
| 2026-05-08 | Initial draft | Phase 2 planning |
| 2026-05-08 | Split 02-02 → 02-02 + 02-03; rerouted task IDs in the verification map | checker scope_sanity blocker #2 |
| 2026-05-08 | Added 02-01-03 (git-mode bare-repo test); bumped sync-src test count 8 → 9 | checker blocker #3 |
| 2026-05-08 | Marked 02-03-12 as using REAL `scripts/sync-src.mjs` via `spawnSync` (no manual cp re-copy) | checker warning #6 |
| 2026-05-08 | Removed `tests/fixtures/k6page-test-subclass.ts` from Wave 0 list (inline subclass replaces it) | checker warning #7 |
| 2026-05-08 | Documented native-`getByRole` feature-detect coverage in 02-02-02 | checker warning #8 |
| 2026-05-08 | Set `nyquist_compliant: true` after blocker #3 closed the test-coverage gap | checker blocker #4 |
