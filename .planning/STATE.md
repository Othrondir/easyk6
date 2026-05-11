---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: Phase 03 in progress (1/2 plans complete — 03-01 foundation green, 03-02 pending)
stopped_at: Plan 03-01 complete (registry skeleton + smoke entry + runtime/runner/Vite rewire + carry-forward fixes). 84/84 tests green, build + validate-build green, manual dry-run prints locked invariant string. Plan 03-02 still pending — owns scenario authoring + 3 real smoke runs against QAbbalah + Phase 1 shell deletion.
last_updated: "2026-05-11T15:30:00.000Z"
progress:
  total_phases: 5
  completed_phases: 2
  total_plans: 8
  completed_plans: 7
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-08)

**Core value:** Demonstrate that one Playwright POM source can power maintainable k6 browser smoke tests through a clean architecture that recruiters can read, trust, and run locally
**Current focus:** Phase 03 — Smoke Scenarios & Supported Execution

## Current Position

Phase: 03 (smoke-scenarios-supported-execution) — In Progress (1/2 plans complete). Plan 03-02 next.
Plans: 2 plans — 03-01 ✅ (registry skeleton + smoke entry + runtime/runner/Vite rewire + carry-forward), 03-02 pending (scenario authoring + manual smoke evidence + Phase 1 shell delete).
Phase 01 closed 2026-05-08: 3/3 plans executed, UAT 10/10 pass, VERIFICATION re-passed (5/5 truths), SECURITY threats_open=0.
Phase 02 plan 02-01 closed 2026-05-08: 3/3 tasks executed, 9/9 sync-src tests green, Phase 1 contract (7/7) intact, smoke + build + validate all pass. UPST-01 satisfied.
Phase 02 plan 02-02 closed 2026-05-08: 3/3 tasks executed, 49/49 helper tests green (k6page-base 6 + selectors 8 + transforms 30 + patch-injection 5), Phase 1 + 02-01 contracts (16/16) intact, smoke + build + validate all pass. UPST-02 satisfied.
Phase 02 plan 02-03 closed 2026-05-11: 3/3 tasks executed (orchestrator + vendor + demo patch + integration round-trip), 8/8 Wave 0 + integration tests green (convert-pages 6 + convert-roundtrip 1 + upst-03-roundtrip 1), Phase 1 + 02-01 + 02-02 contracts (65/65) intact, smoke + build + validate all pass. Real round-trip against `../easyPlaywright` produces byte-identical 4361-byte `lib/pages/HomePage.ts` with `extends K6Page` + `measureNavigation` + locked banner. UPST-03 satisfied.
Phase 03 plan 03-01 closed 2026-05-11: 9/9 tasks executed (Wave 0 RED + BasePage carry-forward + .gitkeep skip + registry skeleton + simulation entry + runtime-config rewire + perf-runner argv + vite/validate dual-entry + green-bar gate), 84/84 unit + integration tests green (+11 new cases over Phase 2 baseline 65). `npm run build` emits both `dist/tests/smoke/smoke-shell.test.js` (transition) AND `dist/simulations/smoke.js` (canonical). `node scripts/perf-runner.mjs --profile smoke --demo --dry-run` prints `k6 run -e SCENARIO=home-smoke dist/simulations/smoke.js` verbatim. R6a strip rule + lib/pages/BasePage.ts passthrough together close the Phase 2 dangling-import landmine; `.gitkeep` skip lands in BOTH sync-src and convert-pages emptyDir/emptyLibPagesExceptBase. Requirements BUILD-03, SCEN-01, SCEN-03, PROF-01 satisfied (SCEN-02 + manual smoke evidence still owned by Plan 03-02).

## Performance Metrics

**Velocity:**

| Phase | Plans | Duration | Notes |
|-------|-------|----------|-------|
| Phase 01 | 2 planned | - | Build/config/project-shape foundation |
| Phase 02 | 2 planned | - | Upstream sync and conversion |
| Phase 03 | 2 planned | - | Smoke flows and supported execution |
| Phase 04 | 1 planned | - | Example profiles and output |
| Phase 05 | 1 planned | - | Docs and recruiter polish |
| Phase 01 P01 | 3 min | 2 tasks | 30 files |
| Phase 01 P02 | 7 min | 2 tasks | 9 files |
| Phase 01 P03 | 6 min | 2 tasks | 3 files |
| Phase 02 P01 | 7 min | 3 tasks | 6 files |
| Phase 02 P02 | 7 min | 3 tasks | 12 files |
| Phase 02 P03 | 18 min | 3 tasks | 9 files |
| Phase 03 P01 | 35 min | 9 tasks | 18 files (4 new + 14 modified) |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Key decisions from initialization:

- [Init]: `easyPlaywright` is the permanent upstream model
- [Init]: `ir-perf-k6` is a pattern source, not a blueprint to copy wholesale
- [Init]: Smoke is the supported first-class workflow
- [Init]: Load and capacity remain example code paths in this milestone
- [Init]: Grafana work is explicitly deferred
- [Phase 01]: Keep the public smoke/perf/sync/convert command surface present now, but make the unfinished commands explicit placeholders instead of fake implementations. — Phase 1 needed a truthful command contract without pretending the runtime/config work from later plans already existed.
- [Phase 01]: Archive the old JavaScript starter under legacy-js so the root layout tells the new TypeScript-first story immediately. — The repo root now needs to communicate upstream source, generated k6 output, and custom patch boundaries at a glance.
- [Phase 02 / 02-01]: sync-src derives `projectRoot` from `process.cwd()` (not `import.meta.url`) so tests can drive the script with `cwd: <tmpRoot>` and assert against ephemeral target dirs. The path-safety check still consults the script's real location so test fixtures inside the easyk6 repo remain reachable from any cwd. — This is the cleanest reconciliation between the plan's smoke-run criterion (cwd is real repo) and its test acceptance (cwd is tempdir).
- [Phase 02 / 02-01]: `commander.exitOverride()` is paired with a parse-error catcher in `main()` so `--help` / `--version` exit 0 cleanly while genuine flag errors fall through to the standard `main().catch -> exit 1` path. — Pattern that future Phase 2 scripts (`convert-pages.mjs`) should mirror.
- [Phase 02 / 02-01]: `.sync-meta.json` lives inside the synced directory and is wiped + rewritten atomically per sync — never absent post-sync. — Convert-pages must not consume it; it is a recruiter-readable provenance signal only.
- [Phase 02 / 02-02]: K6Page.navigate() no-ops on empty pageUrl rather than calling page.goto('') so subclasses can extend without setting pageUrl and tests can construct K6Page directly without a goto-mock side effect.
- [Phase 02 / 02-02]: K6Page.waitForLoadState() uses runtime feature-detection (`'waitForLoadState' in this.page`) — flagged as A1 in inline JSDoc — so the implementation degrades to a no-op if a future k6 minor renames or removes the API.
- [Phase 02 / 02-02]: K6PlaywrightSelectors.getByRole prefers native page.getByRole when available (A2 fallback). The shim's legacy `[role=...]` + filter path remains for k6 versions that lack accessible-name semantics.
- [Phase 02 / 02-02]: Patch-injector blank-line separator between patch and `// #endregion` (or final `}`) is intentional — the locked algorithm always emits an extra '\n' after patchContent for recruiter-readable spacing. Tests assert ordering rather than no-blank-line.
- [Phase 02 / 02-02]: ts.transpileModule + base64 data-URL chained loader is the established Phase-2 pattern for loading sibling-imported TypeScript in tests — transpile dependency, encode as data URL, rewrite parent's `from './sibling'` to point at it, transpile parent. Reusable by Plan 02-03 tests.
- [Phase 02 / 02-03]: convert-pages.mjs derives projectRoot from process.cwd() (mirrors Plan 02-01 sync-src.mjs decision). Lets tests drive the script with cwd:<tempdir> and ephemeral tempdirs become the project root without polluting the developer working tree. The orchestrator has no upstream-source flag so there is no path-traversal surface to gate.
- [Phase 02 / 02-03]: Integration test spawns the REAL repo scripts (scripts/sync-src.mjs + scripts/convert-pages.mjs) with cwd:<tempdir> rather than copying scripts into the tempdir. Both scripts derive projectRoot from process.cwd() so they read/write the tempdir while commander + helper imports resolve from the real repo's node_modules. The fake upstream lives as a sibling tempdir under tmpdir() so sync-src's path-safety check accepts it. Closes warning #6 structurally.
- [Phase 02 / 02-03]: transforms.mjs unsupported-assertion branch absorbs leading `await `/`return ` and trailing `;` into the commented region (Rule-1 fix matching ir-perf-k6 convert-to-k6.sh:604-611). Without this, `await expect(this.x).toHaveText('y');` produced invalid TypeScript. Plan 02-02 transforms unit suite (30/30) still passes — only the emit shape of the existing branch was widened to cover surrounding tokens.
- [Phase 03 / 03-01]: BasePage carry-forward uses RESEARCH §3.2(c) "do both" — converter R6a `stripLocalBasePageImports` for the recruiter-facing common case AND `lib/pages/BasePage.ts` 3-line K6Page passthrough shim for edge-case POM variants the strip rule misses. Skip-list in `emptyLibPagesExceptBase` keeps the shim across wipes; `.gitignore !lib/pages/BasePage.ts` keeps it tracked across clones. Either arm alone leaves a known failure mode.
- [Phase 03 / 03-01]: `.gitkeep` survival lands in BOTH `scripts/sync-src.mjs::emptyDir` AND `scripts/convert-pages.mjs::emptyLibPagesExceptBase` (single `.filter` insert + skip-list entry). Closes deferred-items.md §3 — recruiter cycles no longer produce `D src/pages/.gitkeep` / `D lib/pages/.gitkeep` noise in `git status`.
- [Phase 03 / 03-01]: Q3 landmine fix encoded in `lib/simulations/smoke.ts` as an explicit `await page.goto(runtimeConfig.baseUrl)` inside the `try` block BEFORE `await entry.fn(...)`. HomePage.pageUrl='' so K6Page.navigate()'s `if (this.pageUrl)` guard short-circuits; without the entry's explicit goto, the scenario strands on a blank page. RESEARCH §7 Q3.1 + Assumption A7.
- [Phase 03 / 03-01]: `resolveEntryFile` rewired from scenario-keyed to profile-keyed (`return \`dist/simulations/\${profile}.js\``). Phase 4 load/capacity profiles slot in by authoring `lib/simulations/load.ts` / `lib/simulations/capacity.ts` without further runtime-config changes. `PHASE_ONE_SMOKE_ENTRY_FILE` retained as transition alias for validate-build.mjs until Plan 03-02 drops the Phase 1 shell.
- [Phase 03 / 03-01]: `-e SCENARIO=<id>` is added to k6 spawn argv as a SECOND surface alongside the existing `K6_SCENARIO` env var (Phase 1 contract). Both stay live during transition; smoke.ts reads `__ENV.SCENARIO` to drive registry dispatch while runtime-config.ts continues to consume `K6_SCENARIO` for the Phase 1 shell path. No coupling between perf-runner and the registry — registry-shape validation lives in the simulation, not in the runner.
- [Phase 03 / 03-01]: Multi-source data-URL loader pattern extended from `tests/unit/k6page-base.test.mjs:23-58` (single-source rewrite) to N-specifier object map in `tests/unit/scenarios-registry.test.mjs`. Stubs `k6/browser`, `@lib/scenarios`, `@pages/base/selectors`, `@config` so the `options` literal in `smoke.ts` can be asserted without resolving aliases — `ts.transpileModule` doesn't resolve, but the dynamic `import()` does. The default function body is never invoked from the test.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| init-001 | Generated initial GSD config and project guide scaffold | 2026-04-23 | Pending | .planning / CLAUDE.md |

## Session Continuity

Last session: 2026-05-11T15:30:00Z
Stopped at: Plan 03-01 complete — 9/9 tasks atomic-commit-landed (27f4bba…5e4d54f), SUMMARY.md authored, STATE.md + ROADMAP.md updated. 84/84 unit + integration tests green; `npm run build` emits both `dist/tests/smoke/smoke-shell.test.js` (transition) and `dist/simulations/smoke.js` (canonical); `npm run validate:build` exits 0; `node scripts/perf-runner.mjs --profile smoke --demo --dry-run` prints `k6 run -e SCENARIO=home-smoke dist/simulations/smoke.js`. Foundations ready for Plan 03-02 scenario authoring + manual smoke evidence + Phase 1 shell removal.
Resume file: .planning/phases/03-smoke-scenarios-supported-execution/03-02-PLAN.md

Next best action:

- `/gsd-execute-phase 3` — run Plan 03-02 (3 tasks, autonomous: false; Task 2 is a checkpoint:human-verify capturing three real `npm run smoke` runs against QAbbalah: home-smoke / blog-post-smoke / unknown-scenario fail-fast).
- Plan 03-02 (3 tasks): author lib/scenarios/home-smoke.ts + lib/scenarios/blog-post-smoke.ts → tighten tests/unit/scenarios-registry.test.mjs metadata assertions (Task 1) → manual checkpoint with 3 real runs captured in SUMMARY.md (Task 2) → delete Phase 1 k6/simulations/smoke/smoke-shell.test.ts + drop `dist/tests/smoke/smoke-shell.test.js` from validate-build.mjs (Task 3, after Task 2 green).
- Carry-forward notes for Plan 03-02 (from 03-01-SUMMARY.md "Handoff State for Plan 03-02"):
  - dist/simulations/smoke.js builds clean; Q3 page.goto fix already in place; D-66 thresholds wired verbatim.
  - Registry has placeholders; Plan 03-02 mutates the bound `fn` references only.
  - `-e SCENARIO=` plumbing is live; SCEN-03 fail-fast message format is `Unknown scenario '<id>'. Available: home-smoke, blog-post-smoke`.
  - `.gitkeep` files are stable; no more `D` lines in `git status` during dev cycles.
- Outstanding hygiene item (still): add `.gitignore` rules for synced + generated artifacts beyond the existing allowlist exceptions — logged in .planning/phases/02-upstream-sync-k6-adaptation/deferred-items.md (the existing rules now cover `src/pages/*`/`lib/pages/*` minus .gitkeep + base + BasePage.ts; the deferred item may be effectively closed by Phase 3, but leave for Phase 5 docs to confirm).
