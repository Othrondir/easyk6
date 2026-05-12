# Phase 2: Upstream Sync & k6 Adaptation - Context

**Gathered:** 2026-05-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the sync → convert → patch pipeline that turns `easyPlaywright` Playwright Page Objects into k6-safe modules under `lib/pages/`, and persist k6-only extensions in `lib/pages-k6-patches/` so they survive repeated re-sync cycles. This phase implements UPST-01, UPST-02, UPST-03. It does not write smoke scenarios, scenario registry, or runner CLI growth — those belong to Phase 3.

</domain>

<decisions>
## Implementation Decisions

### Upstream source mode (sync:src)
- **D-22:** `sync:src` supports two modes: local filesystem copy (default) and git clone. Recruiter-friendly local path keeps the showcase zero-network; git mode keeps the pipeline portable to a clean checkout.
- **D-23:** Default upstream source path is `../easyPlaywright` (sibling repo). Override via `--source <path>` flag or `EASYPLAYWRIGHT_SRC` env var.
- **D-24:** Git mode is opt-in via `--repo <url>` and `--branch <ref>` flags; mirrors `ir-perf-k6/scripts/sync-frontend-src.mjs` shape (depth=1 clone into temp dir, then copy `src/pages/`).
- **D-25:** Sync only mirrors upstream `src/pages/` into local `src/pages/`. Other upstream content (`src/data/`, `src/fixtures/`, `src/utils/`, `src/tests/`) is out of scope for v1 — POMs are the recruiter-facing artifact.
- **D-26:** Sync is idempotent: `src/pages/` is emptied before copy. Local edits there are by definition non-persistent (the patches layer holds anything that must survive).
- **D-27:** `src/pages/.sync-meta.json` is written on every sync with `{ source, mode, branch?, commit?, syncedAt }`. Recruiters can read where the upstream came from at a glance.
- **D-28:** Non-CI runs prompt before wiping `src/pages/`. `--yes` and `CI=1` skip the prompt. Mirrors `sync-frontend-src.mjs` UX.

### Conversion engine (convert-pages)
- **D-29:** Conversion is implemented in Node.js (ESM `.mjs`), not Bash. The host is Windows-friendly and the existing `scripts/*.mjs` Phase 1 baseline already proves the pattern; bash+sed pipelines from `ir-perf-k6` would require WSL or Git Bash for recruiters.
- **D-30:** Transform strategy: line/regex rewrites for the simple rules (Playwright import strip, k6 import injection, `class X {` → `class X extends K6Page {`, `.first()` → `.nth(0)`, helper path remaps). A balanced-parentheses walker (Node port of the python routine in `convert-to-k6.sh`) handles `expect(...).toBeVisible()` → `await ....waitFor({ state: 'visible' })` since these can contain nested calls.
- **D-31:** `convert-pages` runs in ALL mode for v1 — every `*.ts` under `src/pages/` is converted. No selective dependency-graph walk in this milestone. easyPlaywright is small (~5 POM files plus components), so the simpler story wins.
- **D-32:** Conversion fidelity matches `ir-perf-k6/config/convert-to-k6.sh` rules at parity for the patterns present in easyPlaywright POMs:
  - Strip `@playwright/test` imports
  - Inject `Page, Locator from 'k6/browser'`, `K6Page` from local base
  - Make every concrete page `extends K6Page` and inject `super(page)` if absent
  - Convert `expect(X).toBeVisible()` / `.toBeHidden()` / `.toBeEnabled()` to `await X.waitFor({ state: ... })`
  - Comment out unsupported assertions (`toHaveText`, `toHaveCount`, `toBe`, etc.) with `// k6-compat:` prefix
  - Rewrite `getByTitle(...)` → CSS `[title="..."]` locator, route `getByText`/`getByRole`/`getByTestId` through `this.selectors.*`
  - Convert `.first()` → `.nth(0)`, `.last()` → `.nth(-1)`, `.clear()` → `.fill('')`
- **D-33:** Generated files are written with a header banner: `// K6-compatible version - Auto-generated from Playwright Page Object` plus source path. Same convention as `ir-perf-k6` so a reviewer who has seen one repo recognizes the other.
- **D-34:** `convert-pages` clears `lib/pages/` (except `lib/pages/base/`) before generating, so deleted upstream POMs don't leave orphan generated files.
- **D-35:** Conversion errors are reported per file but don't abort the run; exit code is non-zero if any file failed. Mirrors ir-perf behavior.

### K6Page base class
- **D-36:** A hand-written `lib/pages/base/base-page.ts` (exporting `K6Page`) is the parent every generated POM extends. Authored in this phase, not generated. Adapts the ir-perf-k6 K6Page contract: holds the k6 `Page`, exposes `selectors` (k6-Playwright selector wrapper) and a `navigate(url)` helper aligned to `BasePage` from upstream.
- **D-37:** `lib/pages/base/base-page.ts` is hand-authored in this phase, not generated, and lives alongside the generated POMs but outside the wipe path. Documented as a custom layer in `PROJECT_STRUCTURE.md`.
- **D-38:** Selector wrapper (`this.selectors.getByText/getByRole/getByTestId`) is a thin shim over k6 browser locators that mirrors Playwright's accessor names so converted code stays idiomatic. Lives at `lib/pages/base/selectors.ts`.

### Patch layer (lib/pages-k6-patches)
- **D-39:** Patch mechanism is file-injection: a patch file at `lib/pages-k6-patches/<rel>.k6-patch.ts` is concatenated into the generated `lib/pages/<rel>.ts` immediately before the last `// #endregion` marker. Mirrors `ir-perf-k6` pattern exactly. Recruiter-readable.
- **D-40:** When the upstream POM has no `// #endregion` marker, the patch is injected before the final closing brace of the class.
- **D-41:** Patch files are plain TypeScript fragments (method bodies inside an existing class scope), not module files. They do not declare imports — any extra imports they need must already be injected by the converter or live in K6Page.
- **D-42:** v1 ships at least one demonstration patch on `HomePage` (e.g., a k6-only timing helper or a simplified smoke navigation that bypasses Playwright-only assertions) so the mechanism is provably load-bearing, not theoretical.
- **D-43:** `convert-pages` logs `↳ Injecting k6-specific methods from: <patch>` whenever a patch is applied. Same UX line as ir-perf.
- **D-44:** Patches must survive a fresh `sync:src` + `convert-pages` round-trip without manual intervention. This is the UPST-03 acceptance check that gets exercised in the phase verification.

### Plan split
- **D-45:** 02-01-PLAN.md owns sync workflow and source-folder boundaries (sync-src.mjs, .sync-meta.json, README/PROJECT_STRUCTURE updates that explain upstream→generated→custom flow).
- **D-46:** 02-02-PLAN.md owns the converter, K6Page base, selector shim, patch-layer injection, and the demonstration patch.

### Out of scope for Phase 2
- **D-47:** No scenario registry, simulation entrypoint, or smoke flow content — those belong to Phase 3.
- **D-48:** No load/capacity profiles — Phase 4.
- **D-49:** No CI workflow, no Docker image — local-first scope holds.
- **D-50:** No upstream content beyond `src/pages/` — fixtures, data, tests, utils stay in upstream and are not synced in v1.

### Claude's discretion
- Exact module names within `lib/pages/base/` (e.g., `selectors.ts` vs `k6-selectors.ts`)
- Internal helper functions inside `scripts/sync-src.mjs` and `scripts/convert-pages.mjs`
- Wording of error/progress messages from sync and convert (must stay clear and recruiter-friendly)
- Whether the balanced-paren walker is one inline function or a tiny helper module
- Exact contents of the demonstration k6 patch on `HomePage`, as long as it exercises the injection mechanism end-to-end

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase and product framing
- `.planning/PROJECT.md` — vision, recruiter-facing constraints, local-first scope
- `.planning/REQUIREMENTS.md` — Phase 2 covers UPST-01, UPST-02, UPST-03
- `.planning/ROADMAP.md` — Phase 2 boundary, success criteria, dependency on Phase 1
- `.planning/phases/01-foundation-project-shape/01-CONTEXT.md` — locked folder/command surface that Phase 2 fills in
- `.planning/phases/01-foundation-project-shape/01-VERIFICATION.md` — Phase 1 wired contracts (build, runner, config) that Phase 2 must not break

### Permanent upstream model (sync source)
- `../easyPlaywright/src/pages/BasePage.ts` — abstract base that converted POMs functionally replace via K6Page
- `../easyPlaywright/src/pages/HomePage.ts` — composed page-object example; primary candidate for the demonstration k6 patch
- `../easyPlaywright/src/pages/AboutPage.ts` — page-specific locator shape
- `../easyPlaywright/src/pages/PostPage.ts` — additional POM, used to validate ALL-mode conversion
- `../easyPlaywright/src/pages/components/` — component composition pattern that converter must preserve
- `../easyPlaywright/src/pages/index.ts` — barrel export that informs how `lib/pages/index.ts` should look post-conversion
- `../easyPlaywright/playwright.config.ts` — upstream baseURL/demo-target context (already aligned with QAbbalah)
- `../easyPlaywright/package.json` — upstream toolchain, confirms Playwright TS POM contract

### Reference architecture (proven patterns to mirror)
- `../ir-perf-k6/config/convert-to-k6.sh` — full conversion ruleset; v11 balanced-paren handler is the source of truth for the Node port
- `../ir-perf-k6/scripts/sync-frontend-src.mjs` — Node clone-and-copy pattern; `scripts/sync-src.mjs` adapts this with local-mode added
- `../ir-perf-k6/lib/base/` — K6Page contract reference for the hand-written `lib/pages/base/base-page.ts`
- `../ir-perf-k6/lib/pages-k6-patches/` — patch-file format examples (TypeScript fragment, no imports, injected before `// #endregion`)
- `../ir-perf-k6/scripts/k6-runner.js` — runner UX style for messages and progress reporting (informational only; the runner itself stays Phase 1's `perf-runner.mjs`)

### Local Phase 2 placeholders to replace
- `scripts/sync-src.mjs` — currently `console.log('Phase 2 owns this implementation.')`
- `scripts/convert-pages.mjs` — currently `console.log('Phase 2 owns this implementation.')`
- `src/pages/.gitkeep`, `lib/pages/.gitkeep`, `lib/pages-k6-patches/.gitkeep` — boundary markers; will coexist with real content
- `package.json` — `sync:src` and `convert-pages` scripts already routed to the placeholders; no script-name changes needed

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/perf-runner.mjs` — Phase 1 runner shows the cross-platform Node ESM CLI shape (commander-free, plain `process.argv`, dotenv awareness). Sync and convert scripts follow the same shape.
- `lib/config/runtime-config.ts` — fail-fast validation pattern that converter error reporting can mirror in tone (clear single-line errors, no stack-trace noise).
- `vite.config.ts` — already declares aliases `@config`, `@pages`, `@src-pages`, `@k6`. `@pages` resolves to `lib/pages`, so generated output drops in without alias changes.
- `tsconfig.json` — TS path mapping aligned with the Vite aliases; converted POMs typecheck against it.
- `tests/unit/runtime-config.test.mjs` and `tests/unit/perf-runner.test.mjs` — `node --test` baseline that Phase 2 mirrors for `sync-src` and `convert-pages` unit coverage.

### Established Patterns
- All Phase 1 scripts are ESM `.mjs`, plain Node, no extra runtime deps beyond `commander` + `dotenv` already in `package.json`. Phase 2 honors this — no new prod deps, sync/convert use only `node:fs`, `node:path`, `node:child_process`.
- Phase 1 commands stay short and recruiter-friendly (`smoke`, `perf`, `sync:src`, `convert-pages`). Phase 2 keeps that surface; new behavior is exposed via flags on existing commands, not new top-level scripts.
- Phase 1 documentation pattern (architecture-first README, then `PROJECT_STRUCTURE.md` for folder map) is the template for the Phase 2 doc updates.

### Integration Points
- `lib/pages/` is referenced by Vite alias `@pages` and by future Phase 3 scenarios at `k6/scenarios/*.ts`.
- `lib/pages-k6-patches/` has no consumers other than `convert-pages` itself — confirms file-injection is the right abstraction (vs. runtime imports).
- `src/pages/` is the only directory `sync:src` writes to. `lib/pages/` is the only directory `convert-pages` writes to (excluding `lib/pages/base/` which is hand-authored). Clear blast radius for both commands.
- Phase 3 will import from `@pages/HomePage` etc. — naming/casing of generated files must match upstream filenames exactly.

</code_context>

<specifics>
## Specific Ideas

- The sync→convert→patch story should read top-to-bottom in the README quickstart: `npm run sync:src` → `npm run convert-pages` → `npm run smoke`. Phase 2 must keep that linear narrative true.
- Recruiters reading `scripts/convert-pages.mjs` should be able to identify the conversion rules without running the code. Comments on each transform group help (e.g., "// expect → waitFor (k6 has no abort-on-fail equivalent)").
- The `.sync-meta.json` file is a recruiter signal: it shows the showcase repo treats upstream as a real artifact with provenance, not just copied code.
- The demonstration patch on `HomePage` should be small but obviously k6-specific (e.g., a `measureNavigation()` helper that returns timing data) — proves the mechanism without being weight.
- ir-perf-k6's converter is the source of truth for transformation correctness, but its exact line counts and message formats are not the goal. Faithfulness to the rules matters; faithfulness to the code style does not.

</specifics>

<deferred>
## Deferred Ideas

- **Selective conversion mode** (only convert POMs imported by k6 scenarios) — useful once the scenario tree grows; not needed when upstream has ~5 POMs. Revisit if Phase 3+ adds many scenarios with sparse POM usage.
- **Sync of upstream `src/data/` and `src/fixtures/`** — if Phase 3 smoke scenarios need shared test data, lift that under a future UPST-04 requirement.
- **Generic multi-upstream adapter** — already explicitly out of scope per REQUIREMENTS.md; restate here for clarity.
- **AST-based conversion via ts-morph** — cleanest long-term approach; deferred because regex+balanced-paren walker is sufficient for upstream POM patterns and avoids a 500KB+ dev dependency in a showcase repo.
- **Conversion of upstream `src/tests/` Playwright specs into k6 scenarios** — explicit non-goal in this milestone; scenarios are hand-written in Phase 3 against converted POMs.
- **Patch validation step** that diffs generated output before/after patch injection — nice to have for re-sync confidence; not required for Phase 2 success criteria.

</deferred>

---

*Phase: 02-upstream-sync-k6-adaptation*
*Context gathered: 2026-05-08*
