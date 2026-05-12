# Phase 5: Showcase Docs & Recruiter Polish - Pattern Map

**Mapped:** 2026-05-12
**Files analyzed:** 7 (2 created/heavily rewritten, 3 deleted, 2 optional polish)
**Analogs found:** 7 / 7 (every file has a concrete doc-shape analog)

This phase is **docs-only** — no runtime code is touched. Pattern analogs are therefore doc-shape sources: the existing repo's `README.md` and `PROJECT_STRUCTURE.md`, the sibling `ir-perf-k6/docs/DEVELOPMENT.md` reference architecture, prior phase `SUMMARY.md` narrative patterns, `CLAUDE.md`'s pinned tech-stack tables, and `.planning/STATE.md`'s decision log shape.

The planner consumes the per-file "Pattern Assignments" section to copy doc structure and verbatim text into the new files. The "Shared Patterns" section captures cross-cutting doc conventions (decision-log indexing, recruiter-readable framing, deferred-work surfacing).

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `README.md` (FULL REWRITE — D-06) | recruiter-facing doc (top-level entry) | request-response (recruiter scans top-to-bottom) | self (current `README.md` § Quickstart + § Architecture First + § Commands + § Upstream Reuse) AND `ir-perf-k6/README.md` (sibling reference for top-of-file lede + Documentation table pattern) | exact (self for verbatim table + sections; sibling for structural shape) |
| `ARCHITECTURE.md` (NEW — D-04, D-07) | recruiter-facing doc (deep-dive) | request-response (recruiter drills in from README) | `PROJECT_STRUCTURE.md` (existing layout/boundary content folds into §3) + `CLAUDE.md` Technology Stack table (§1 + §2 source material) + `.planning/STATE.md` Decisions block (§5 index source) | role-match (composed from 3 source analogs, no single-file template) |
| `QUICKSTART.md` (DELETE — D-02) | archive (stale doc) | n/a | n/a — deletion only | n/a |
| `CONTRIBUTING.md` (DELETE — D-03) | archive (wrong-frame doc) | n/a | n/a — deletion only | n/a |
| `PROJECT_STRUCTURE.md` (FOLD then DELETE — D-05) | source material → ARCHITECTURE.md §3, then deleted | transform (content moves to new file) | self (layout block + boundary definitions are the fold source) | exact (self-fold) |
| `package.json` description (optional polish — Claude's Discretion) | manifest field | config | self (line 4) | self-reference |
| `CLAUDE.md` Conventions/Architecture placeholders (optional refresh — Claude's Discretion) | maintainer-tooling doc | config | self (sections "## Conventions" + "## Architecture") | self-reference |

---

## Pattern Assignments

### `README.md` (FULL REWRITE — D-06)

**Analogs:**
- **Primary (verbatim preservation):** current `README.md` lines 7-18 (`## Quickstart` heading + 3-row Supported-vs-Example table + the gitignored-artifacts sentence) — Phase 4 D-13/D-15 contract, locked
- **Structural (overall shape):** `ir-perf-k6/README.md` (sibling repo's recruiter-facing top-level doc — same role + same data flow)
- **Self (sections to rewrite, not preserve):** current `README.md` lines 1-6, 19-110 (lede, Architecture First, Commands, Upstream Reuse, Runtime Config, Legacy Note, Next Reference)

---

**Pattern A — Lede sentence shape** (current `README.md:3-5` — REWRITE; remove Phase-1 stale framing):

Current text to **DELETE** (line 5 — stale by four phases per D-06):
```
Phase 1 establishes the build foundation, repo boundaries, and the shared runtime-config contract behind `npm run smoke` and `npm run perf`.
```

Current text to **KEEP as opening** (line 3 — accurate framing):
```
EasyK6 is a recruiter-facing k6 browser performance framework that reuses Playwright page objects as the long-term upstream model while keeping the local developer experience simple.
```

**Sibling lede shape for inspiration** (`ir-perf-k6/README.md:1-4`):
```
# IriusRisk k6 Performance Testing Framework

k6/xk6-browser performance testing for IriusRisk UI and API using TypeScript, Vite, and Docker.

## Quick Start
```

**Recommended new lede shape (planner's call within D-06 freedom):** project title + one-line core-value sentence + one-line "what makes this different" sentence (upstream-reuse), followed immediately by the §Quickstart table. Recruiter's first 30 seconds per the §Specifics critique.

---

**Pattern B — Quickstart Supported-vs-Example table (PRESERVE VERBATIM per D-06)**

This is the Phase 4 D-13/D-15 locked contract. **Copy these lines exactly** from current `README.md:7-17` into the rewritten README:

```markdown
## Quickstart

Smoke is the supported demo path; load and capacity are illustrative examples sharing the same architecture.

| Command | Status | What it does |
|---|---|---|
| `npm run smoke` | **Supported** | Default smoke profile against the demo target (recruiter demo path). |
| `npm run example:load` | _Example_ | Illustrative load profile (ramping-vus, 5 VUs, ~2 min). |
| `npm run example:capacity` | _Example_ | Illustrative capacity profile (ramping-arrival-rate, find-the-ceiling, ~3 min). |

All three profiles write recruiter-readable artifacts to `reports/<profile>-<scenario>.md` + `reports/<profile>-<scenario>.json` (gitignored).
```

**Verbatim guarantee:** Bold `**Supported**`, italic `_Example_`, exact command names (`npm run smoke`, `npm run example:load`, `npm run example:capacity`), exact parenthetical descriptions ("ramping-vus, 5 VUs, ~2 min", "ramping-arrival-rate, find-the-ceiling, ~3 min"), and the gitignored-artifacts trailing sentence. Any change to this block is a Phase 4 contract break.

---

**Pattern C — Documentation cross-link table** (analog: `ir-perf-k6/README.md:21-29`):

Sibling repo uses a table of pointer links to its `docs/` subdirectory. EasyK6's flat layout per D-04 means at most a single inline reference to `ARCHITECTURE.md` is appropriate. Recommended shape (planner's exact wording — minimum signal, maximum scannability):

```markdown
## Architecture

For the design narrative — what was adapted from `ir-perf-k6`, what was simplified, and why — see [ARCHITECTURE.md](ARCHITECTURE.md).
```

Do **not** replicate the multi-row Documentation table from `ir-perf-k6` — there is only one downstream doc to link, so a single-paragraph pointer reads cleaner.

---

**Pattern D — Commands block** (current `README.md:54-63` — KEEP but trim Phase-1 transitional commentary):

Current shape stays useful (recruiter-scannable bash block):
```bash
npm install
npm run build
npm run validate:build
npm run smoke
npm run perf
npm run sync:src
npm run convert-pages
```

**Modification:** Drop the "Current command status" bullet list at `README.md:75-82` — its Phase-1 framing ("…stays reserved for the next Phase 2 plan…") is stale by four phases. Replace with terse current-state descriptions (one line each) OR fold the descriptions into the Commands block as inline `#` comments. Planner's call.

---

**Pattern E — Upstream Reuse narrative** (current `README.md:65-73` — KEEP shape, refresh tone):

Current 3-step numbered list is the right shape; refresh wording so step 2 no longer says "(lands in the next Phase 2 plan)" and step 3 no longer references Phase-2-future code. The pipeline now exists end-to-end (Phase 2 closed) and Phase 5 docs say so plainly.

**Refreshed shape (recommended):**
```markdown
## Upstream Reuse

The repo treats `easyPlaywright` as the permanent upstream Page Object source. The flow is linear:

1. `npm run sync:src` — copy `easyPlaywright/src/pages/` into `easyk6/src/pages/` (idempotent; wipes the local folder before copy)
2. `npm run convert-pages` — produce k6-safe modules under `lib/pages/`
3. `lib/pages-k6-patches/` — k6-only methods that survive every re-sync/re-convert cycle
```

---

**Pattern F — Runtime Config block** (current `README.md:84-102` — KEEP largely; verify precedence line still reads "CLI > .env > shell env > built-in demo defaults"):

The runtime-config block is recruiter-readable and Phase-1-stable. Inspect for stale references and adjust only if drift surfaces. The "CLI > .env > shell env > built-in demo defaults" precedence line is the BUILD-02 truth.

---

**Pattern G — Legacy Note** (current `README.md:104-106` — KEEP; D-08 confirms `legacy-js/` stays in place):

```markdown
## Legacy Note

The original JavaScript starter remains available under `legacy-js/` for reference and comparison. It is no longer the primary architecture story for this repository.
```

This paragraph also appears (in shorter form) in ARCHITECTURE.md per D-08 — keep both surfaces, README is recruiter-glance, ARCHITECTURE is the rationale.

---

**Pattern H — Next Reference / cross-link footer** (current `README.md:108-110` — REWRITE):

Current line references `PROJECT_STRUCTURE.md` which Phase 5 deletes. Replace with a one-line pointer to `ARCHITECTURE.md` (recruiter drill-down path), OR remove the section entirely if Pattern C already covers the link.

---

**Pattern I — Carry-forward honest surfacing** (D-09 — NEW content, no current README analog):

D-09 mandates BUILD-02 / SCEN-02 / F-01 / F-02 visible to recruiters. Options per D-09:
- (a) Honest "Known carry-forward" mention in README (planner-recommended)
- (b) "Known limitations & deferred work" section in `ARCHITECTURE.md` §2
- (c) Both

**Analog for the "honesty" tone:** `.planning/STATE.md:25-37` (current position narrative — sober, concrete, no marketing). Phase 03-02 SUMMARY.md "Carry-forward" section (`.planning/phases/03-smoke-scenarios-supported-execution/03-02-SUMMARY.md:347-358`) is the precise tonal model: bullet shape `"Item — short factual description — pointer to where it is or where it'll close."`

---

### `ARCHITECTURE.md` (NEW — D-04, D-07, 5 sections in order)

**Analogs (composed from 3 sources, no single-file template):**
- `PROJECT_STRUCTURE.md` (existing layout/boundary block) — folds into §3
- `CLAUDE.md` Technology Stack tables (lines 5-44) — source material for §1 (Adapted) + §2 (Simplified on purpose)
- `.planning/STATE.md` Decisions block (lines 65-100) — source index for §5 (Decision log)
- `ir-perf-k6/docs/DEVELOPMENT.md:1-22` (Table of Contents shape) — structural analog for the 5-section heading order

---

**Pattern A — Top-of-file framing** (no direct analog; planner authors):

Open with one paragraph that says what ARCHITECTURE.md is (the design-narrative companion to README) and who it's for (technical reviewer who wants to know what was adapted, what was simplified, and why). Tone per D-07 Claude's Discretion — first-person engineering narrative is recommended (matches Phase SUMMARY.md voice) but third-person reference is acceptable.

**Sibling shape for inspiration** (`ir-perf-k6/docs/DEVELOPMENT.md:1-4`):
```markdown
# Development Guide

Complete guide for developing k6 performance test scenarios for the IriusRisk application.

## Table of Contents
```

EasyK6 ARCHITECTURE.md is shorter and recruiter-aimed — a Table of Contents is optional (5 H2 sections render naturally in the GitHub sidebar).

---

**Pattern B — §1 "Adapted from `ir-perf-k6`"** (D-07.1):

**Source material:** `CLAUDE.md` lines 5-44 Technology Stack table + Phase 1-4 CONTEXT.md decision IDs that map to lifted patterns.

**Patterns to call out** (per D-07.1):
- Scenario registry (Phase 3 — `.planning/phases/03-smoke-scenarios-supported-execution/03-CONTEXT.md` D-51..D-55)
- TypeScript/Vite build pipeline (Phase 1 — `.planning/phases/01-foundation-project-shape/01-CONTEXT.md` D-05 + D-08)
- Profile-keyed runner (Phase 3 — D-62 `dist/simulations/${profile}.js`)
- `handleSummary` factory (Phase 4 — D-16 `makeHandleSummary({ profile, scenarioGetter, baseUrlGetter })`)

**Tonal model:** `.planning/PROJECT.md:42-43` ("`ir-perf-k6` is the reference for architecture patterns: scenario registry, runner CLI, TypeScript/Vite build, converted page layers, smoke/load/capacity profiles, and report-oriented execution"). Recruiter-readable, no enterprise jargon.

**Recommended closing pattern per §Creative Options:** end each lifted-pattern bullet with a "what got dropped" callout (e.g., *"Scenario registry: KEPT. Multi-team scenario matrix: DROPPED — see §2"*) — reinforces the simplification narrative without leaving §2 to do all the work.

---

**Pattern C — §2 "Simplified on purpose"** (D-07.2):

**Source material:**
- `CLAUDE.md` "What NOT to Use" table (the explicit rejections)
- `.planning/PROJECT.md:32-37` "Out of Scope" list (Grafana, multi-upstream, enterprise scenario matrix, Kubernetes)
- `.planning/REQUIREMENTS.md:38-48` v2 requirements (OBS-01/02, FRAME-01/02/03) that this section names-and-defers

**Hiring-signal sentence pattern (per §Specifics critique):** Each "we did NOT include X because Y" line is a hiring-signal sentence. Don't bury them. Shape:

```markdown
- **No Grafana / OTEL integration** — `OBS-01`/`OBS-02` are v2 work. v1 emits `reports/<profile>-<scenario>.md` so a reviewer reads results in 30 seconds without standing up a dashboard.
- **No Kubernetes execution** — local-first showcase scope. `ir-perf-k6` runs in EKS via k6-operator; EasyK6 v1 runs on your laptop and that's the point.
- **No multi-upstream adapter** — `easyPlaywright` is the permanent v1 model. `FRAME-03` opens that surface later.
- **No enterprise scenario matrix** — two scenarios (`home-smoke`, `blog-post-smoke`) prove the registry; more breadth without more depth would dilute the signal.
- **No cloud k6** — local-first holds.
- **No CI/CD smoke-on-PR** — `FRAME-02` is v2 work.
```

**Carry-forward placement option** per D-09(b): If planner chooses to surface BUILD-02 / SCEN-02 / F-01 / F-02 in ARCHITECTURE.md (vs README per D-09(a)), append a "Known limitations & deferred work" subsection here using the Phase 03-02 SUMMARY carry-forward bullet shape:

**Tonal model** (`.planning/phases/03-smoke-scenarios-supported-execution/03-02-SUMMARY.md:347-358`):
```markdown
1. **`PHASE_ONE_SMOKE_ENTRY_FILE` constant** (lib/config/runtime-config.ts:12) — retained as the Plan 03-01 transition alias…
2. **k6 1.5 runtime gotchas, codified during Task 2:** [bullet list]
3. **PostPage upstream selectors** — `getPostBodyLocator` (`postBody` field) doesn't match generic-template post targets…
```

Sober, concrete, no marketing. Each item names the location and the path forward.

---

**Pattern D — §3 "Upstream reuse pipeline"** (D-07.3 — FOLD `PROJECT_STRUCTURE.md`):

**Source material (fold verbatim or near-verbatim, refresh stale references):** `PROJECT_STRUCTURE.md` lines 7-50 (Primary Layout tree + Boundary Definitions).

**Verbatim fold candidates** (current `PROJECT_STRUCTURE.md:42-49`):
```markdown
## Boundary Definitions

- `src/pages = synced upstream Playwright source` (rewritten on every `npm run sync:src`; do not edit by hand)
- `src/pages/.sync-meta.json = upstream provenance file` (recruiter-readable: source path, mode, timestamp)
- `lib/pages = generated k6-compatible output`
- `lib/pages/base = hand-authored K6Page + selector shim`
- `lib/pages-k6-patches = persistent k6-only overrides`
- `k6/scenarios = reusable flows shared by future simulations`
- `k6/simulations = executable k6 entrypoints that build into dist/tests/...`
- `legacy-js = archived starter reference`
```

**Refresh required** (Phase 1-era references to delete):
- Drop "(Phase 2 next plan)" / "(Phase 2 next plan; survives the convert wipe)" / "(Phase 2 next plan; injected at convert time)" parenthetical from `PROJECT_STRUCTURE.md:44-46` — Phase 2 is closed
- Update `k6/simulations = executable k6 entrypoints that build into dist/tests/...` — Phase 3 moved canonical entries to `lib/simulations/` building into `dist/simulations/...`. The `k6/simulations/smoke/smoke-shell.test.ts` Phase 1 shell was deleted in Plan 03-02 Task 3.

**Primary Layout tree** (`PROJECT_STRUCTURE.md:7-38`): Fold the tree but REGENERATE it from current repo state to catch Phase 2-4 additions (`lib/scenarios/`, `lib/simulations/`, `lib/simulations/lib/`, `lib/vendor/`, `reports/` placeholder note).

**Tonal model for pipeline narration:** README's current "Upstream Reuse" section (`README.md:65-73`) is the right shape — numbered linear steps. ARCHITECTURE.md §3 expands this with WHY each step exists, not just WHAT it does.

**`legacy-js/` boundary callout** (D-08 — mandatory):
```markdown
`legacy-js/` preserves the original JavaScript starter for before/after comparison — it is NOT the active codebase.
```

Place inline at the end of the boundary-definitions list or as a short paragraph after the layout tree. The deliberate boundary signals engineering judgment (chose adaptation over rewrite-from-zero erasure).

---

**Pattern E — §4 "k6 1.5 runtime caveats"** (D-07.4):

**Source material (cite, don't duplicate):**
- `.planning/phases/03-smoke-scenarios-supported-execution/03-02-SUMMARY.md:347-358` (Carry-forward §2 "k6 1.5 runtime gotchas, codified during Task 2")
- Plan 03-02 deviation commit `7d629ba` (the four runtime defects + fixes)
- `.planning/phases/04-example-profiles-output-surface/04-RESEARCH.md` §5 Pitfall 1 (line 422 — `browser_http_req_duration` vs `http_req_duration` evidence)

**Caveats list** (per D-07.4 — each shows how the codebase mitigates):

```markdown
- **No global `URL` constructor** — k6 1.5's goja runtime doesn't ship `new URL(...)`. `lib/config/runtime-config.ts::normalizeBaseUrl` uses a regex matcher instead (`^(https?://[^/\s]+)(/.*)?$` + bare-host trailing-slash normalization).
- **System env vars don't reach `__ENV`** — k6 1.5 does NOT inherit shell env vars into `__ENV` without `--include-system-env-vars`. `scripts/perf-runner.mjs::buildK6Args` emits `BASE_URL`, `K6_PROFILE`, `K6_SCENARIO`, `K6_DEMO`, and `SCENARIO` as explicit `-e KEY=VALUE` flags on every spawn.
- **`exec.test.abort` for fail-fast (not raw `throw`)** — k6 1.5 reports exit 0 when all thresholds pass, even if the iteration body throws. `lib/simulations/smoke.ts` calls `exec.test.abort(message)` from `k6/execution` before the defensive throw, which triggers k6 exit code 108 → runner re-rejects → npm exit 1.
- **Browser scenarios route HTTP through chromium** — `http_req_*` metrics read 0 samples for `k6/browser` scenarios (Phase 03-02 SUMMARY Run 1 evidence: `http_req_failed.............: 0.00%  0 out of 0`). Threshold strings target `browser_http_req_duration` instead (load + capacity profiles per Phase 4 D-03/D-08 amendment).
```

**Citation pattern:** Each caveat may link to the SUMMARY.md or commit for recruiter-curious depth, but the bullet itself should be self-contained. Example footer line: *"Detailed evidence in `.planning/phases/03-smoke-scenarios-supported-execution/03-02-SUMMARY.md` (Plan 03-02 deviation commit `7d629ba`)."*

---

**Pattern F — §5 "Decision log"** (D-07.5):

**Source material:** `.planning/STATE.md:64-100` Decisions block (chronologically ordered, init → Phase 4) + `.planning/PROJECT.md:55-62` Key Decisions table.

**Indexing bullet shape** (per §Specifics — INDEX, don't duplicate):
```markdown
- **Phase 3** — chose `exec.test.abort` over raw throw for fail-fast (k6 1.5 reports exit 0 on threshold-pass even with thrown errors). See `.planning/phases/03-smoke-scenarios-supported-execution/03-02-SUMMARY.md`.
```

**Recommended decision-log coverage** (curated, recruiter-readable — not exhaustive):
- **[Init]** — `easyPlaywright` permanent upstream model, smoke as supported workflow, Grafana deferred. See `.planning/PROJECT.md`.
- **Phase 1** — archived JS starter under `legacy-js/`; TypeScript-first new architecture. See `01-CONTEXT.md`.
- **Phase 2** — Node-ESM converter (`convert-pages.mjs`), `lib/pages-k6-patches/` survives re-sync via `// #endregion` injection. See `02-01-CONTEXT.md` / `02-03-SUMMARY.md`.
- **Phase 3** — central scenario registry (`lib/scenarios/index.ts`), kebab-case IDs, profile-keyed `resolveEntryFile`. See `03-CONTEXT.md`.
- **Phase 3 (deviation)** — codified four k6 1.5 runtime caveats in code (commit `7d629ba`). See `03-02-SUMMARY.md`.
- **Phase 4** — `makeHandleSummary` factory at `lib/simulations/lib/summary.ts`, `browser_http_req_duration` thresholds (not `http_req_duration`). See `04-CONTEXT.md` D-03/D-16.

**Brevity discipline:** Each bullet is one line + a pointer. Recruiter can drill in if they want depth; the file itself stays scannable. The decision log is an INDEX, not a re-statement.

---

### `QUICKSTART.md` (DELETE — D-02)

**Action:** Delete the file. No content fold.

**Rationale (verbatim from D-02):** Content is stale (references deleted `tests/smoke/basic-smoke.test.js` and pre-adaptation JS POMs from the original starter). The Phase 4 Quickstart §Supported-vs-Example table in `README.md` already serves the quickstart role.

**Cross-reference cleanup:** Plan must verify no remaining references to `QUICKSTART.md` in:
- `README.md` (after rewrite per D-06)
- `CLAUDE.md`
- `ARCHITECTURE.md` (after creation)
- Inline links inside the planning directory if any docs cite QUICKSTART.md as a deliverable

---

### `CONTRIBUTING.md` (DELETE — D-03)

**Action:** Delete the file. No content fold.

**Rationale (verbatim from D-03):** This is a recruiter-facing portfolio repo, not an OSS project accepting external PRs. A CONTRIBUTING file sets the wrong frame. The maintainer's workflow is captured in `CLAUDE.md` + `.planning/` and stays there.

**Cross-reference cleanup:** Plan must verify no remaining references to `CONTRIBUTING.md` in:
- `README.md` (after rewrite per D-06)
- `CLAUDE.md`
- `ARCHITECTURE.md` (after creation)

The current `QUICKSTART.md:200-202` "Next Steps" block references `CONTRIBUTING.md` — moot once QUICKSTART itself is deleted.

---

### `PROJECT_STRUCTURE.md` (FOLD then DELETE — D-05)

**Action:** Fold valuable content into `ARCHITECTURE.md` §3 (Upstream reuse pipeline) per Pattern D above, then delete the file.

**Fold targets (valuable):**
- `PROJECT_STRUCTURE.md:7-38` Primary Layout tree (refresh stale `k6/simulations/smoke/smoke-shell.test.ts` reference — Phase 3 deleted that file; regenerate tree from current repo state)
- `PROJECT_STRUCTURE.md:40-49` Boundary Definitions block (Phase 1-era "Phase 2 next plan" parentheticals to delete; rest folds verbatim)
- `PROJECT_STRUCTURE.md:52-90` Root Directories descriptions (fold the WHY narrative; refresh Phase-2-future references)
- `PROJECT_STRUCTURE.md:102-114` Sync Provenance table (fold into ARCHITECTURE.md §3 — recruiter-readable provenance is a strong signal)

**Fold targets (drop — stale):**
- `PROJECT_STRUCTURE.md:92-96` Build Flow section — Phase 3 changed canonical entry from `k6/simulations/...test.ts` to `lib/simulations/...ts`; README's Commands section already covers the build flow accurately
- `PROJECT_STRUCTURE.md:98-100` Legacy Policy section — D-08 covers `legacy-js/` boundary in ARCHITECTURE.md §1 or §3 with refreshed framing

**Cross-reference cleanup:** Plan must verify no remaining references to `PROJECT_STRUCTURE.md` in:
- `README.md` line 43 (the current README tree shows `└── PROJECT_STRUCTURE.md` — must update if tree is refreshed in ARCHITECTURE.md §3)
- `README.md` line 110 (`See [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)` — REWRITE per Pattern H above)
- `CLAUDE.md` (none expected; verify)
- `.planning/` references are historical — leave as-is (planning history is allowed to reference deleted files)

---

### `package.json` `description` field (optional polish — Claude's Discretion)

**Analog:** self — `package.json:4`

**Current value** (`package.json:4`):
```json
"description": "K6 Performance Testing Framework with POM (Page Object Model) architecture",
```

**Pattern note:** The current description predates the Phase 1-4 adaptation work and undersells the recruiter-narrative (no mention of upstream reuse, no recruiter-facing framing). Planner judgment per D-Claude's-Discretion:
- Keep as-is (minor mismatch, not a blocker)
- Refresh to recruiter-tuned (e.g., something close to the `.planning/PROJECT.md` Core Value line: "Recruiter-facing k6 browser performance framework; reuses Playwright POMs from easyPlaywright as the permanent upstream model.")

If touched, the change is one line. No other `package.json` fields need polishing for Phase 5.

---

### `CLAUDE.md` Conventions/Architecture placeholders (optional refresh — Claude's Discretion)

**Analog:** self — `CLAUDE.md` "## Conventions" + "## Architecture" sections

**Current state** (both sections — placeholder text):
```markdown
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.

## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
```

**Pattern note:** `CLAUDE.md` is strictly a maintainer-tooling file (AI-assistant guidance), but a recruiter inspecting the repo's GitHub file list will see it. If planner judges the placeholder text reads as unfinished, a one-pass refresh fits the polish theme. Possible refresh content:

- **Conventions** — point to the patterns now established by Phases 1-4 (TypeScript strict, ESM `.mjs` Node scripts, kebab-case scenario IDs, `lib/simulations/lib/` for goja-safe shared helpers, etc.). Brief — 4-8 bullet points.
- **Architecture** — point to `ARCHITECTURE.md` as the canonical source. One sentence: "See `ARCHITECTURE.md` for the design narrative — what was adapted from `ir-perf-k6`, what was simplified, and why."

**Not strictly required** — `CLAUDE.md` works correctly with the placeholders; this is polish-only. Drop if planner judges out-of-scope.

---

## Shared Patterns

### Decision-log indexing (cross-cutting — applies to ARCHITECTURE.md §5 + README D-09 carry-forward)

**Source:** `.planning/STATE.md:64-100` Decisions block + `.planning/PROJECT.md:55-62` Key Decisions table.

**Pattern shape:**
```markdown
- **[Phase N]** — [one-line decision statement]. See `<pointer to evidence>`.
```

Recruiter-curious path: drill into `.planning/phases/<N>-name/N-CONTEXT.md` for the locked decision and `N-XX-SUMMARY.md` for the closure evidence. Never duplicate the decision text in ARCHITECTURE.md; always link.

**Apply to:**
- `ARCHITECTURE.md` §5 (Decision log) — primary application
- `README.md` D-09 carry-forward bullets if planner chooses option (a) — same shape, scoped to BUILD-02 / SCEN-02 / F-01 / F-02

---

### Recruiter-readable + local-first framing (cross-cutting — applies to README + ARCHITECTURE.md)

**Source:** `CLAUDE.md` "## Project" section ("Constraints" subsection lines 18-23) + `.planning/PROJECT.md:48-53` Constraints.

**Pattern principles** (from `CLAUDE.md:19-23`):
- No enterprise framing
- No cloud assumptions
- No internal-context-required jargon
- Showcase quality: naming, folder structure, docs, commands understandable to a technical reviewer without private company context
- Local-first workflow: runnable locally without Kubernetes, cloud infra, or internal services

**Apply to:**
- `README.md` full rewrite — every section
- `ARCHITECTURE.md` full file — especially §2 (Simplified on purpose) where the constraints are most operative

**Quality-gate heuristic** (per §Specifics — "polished rather than experimental"):
- No stale-Phase-N framing (e.g., "Phase 1 establishes…")
- No broken cross-references (deleted-file links removed in same plan)
- No dangling "Phase 2 next plan" notes
- No `pages/YourPage.js`-era examples from the deleted QUICKSTART
- Consistent voice across README + ARCHITECTURE

---

### Out-of-Scope honesty (cross-cutting — applies to README D-09 surface + ARCHITECTURE.md §2)

**Source:** `.planning/PROJECT.md:32-37` Out of Scope + `.planning/REQUIREMENTS.md:38-48` v2 requirements + D-09 carry-forward list.

**Pattern principle:** Surface deferred work explicitly. Don't imply completeness. The §Specifics critique: *"polished rather than experimental is the hardest to objectively grade. Heuristic: no … inconsistent voice across README + ARCHITECTURE."*

**Items requiring honest surface per D-09:**
- **BUILD-02** (runtime config fail-fast on missing/invalid env) — `REQUIREMENTS.md:18` still `[ ]`
- **SCEN-02** (smoke scenarios real journeys vs demo target) — `REQUIREMENTS.md:23` still `[ ]` despite Phase 3 P02 capturing real-run evidence (checkbox-hygiene gap, not missing work)
- **F-01** (capacity real-run deferred from Plan 04-02 due to PC saturation)
- **F-02** (smoke single-iteration LCP renders `n/a` in Key Metrics row)

**Apply to:**
- (a) README "Known carry-forward" mention (recommended per D-09)
- (b) ARCHITECTURE.md §2 "Known limitations & deferred work" subsection
- (c) Both — strongest signal

Phase 03-02 SUMMARY.md Carry-forward bullet shape is the tonal model — sober, concrete, pointer-driven.

---

### Verbatim-preservation discipline (cross-cutting — applies only to Phase 4 Quickstart table)

**Source:** Phase 4 `.planning/phases/04-example-profiles-output-surface/04-CONTEXT.md` D-13 + D-15 (the locked Supported-vs-Example table contract).

**Pattern principle:** When a downstream phase delivered a contract that a later phase consumes, the contract text is locked. Phase 5 must NOT relitigate the Phase 4 Quickstart table — only the surrounding prose is in Phase 5 scope.

**Apply to:**
- `README.md` — copy lines 7-17 of current README VERBATIM into the rewritten README (Pattern B above). Bold `**Supported**`, italic `_Example_`, exact text strings.

**Quality gate:** A diff of the table block between pre-Phase-5 README and post-Phase-5 README should show zero changes. The "Quickstart" heading and surrounding prose may change; the table itself does not.

---

## No Analog Found

No files in this phase lack an analog. All seven files in scope have at least one concrete doc-shape analog in the current repo or sibling `ir-perf-k6` / `easyPlaywright` reference repos. The phase is docs-only — no novel architectural patterns to invent.

---

## Metadata

**Analog search scope:**
- Current repo doc surface (`README.md`, `PROJECT_STRUCTURE.md`, `QUICKSTART.md`, `CONTRIBUTING.md`, `CLAUDE.md`, `package.json`)
- `.planning/` directory (PROJECT.md, STATE.md, REQUIREMENTS.md, ROADMAP.md, all phase CONTEXT.md + SUMMARY.md files referenced in D-CONTEXT canonical refs)
- Sibling reference repos: `C:\Users\pzhly\Documents\GitHub\ir-perf-k6\README.md` + `C:\Users\pzhly\Documents\GitHub\ir-perf-k6\docs\DEVELOPMENT.md` (structural analogs for the ARCHITECTURE.md narrative shape) + `C:\Users\pzhly\Documents\GitHub\easyPlaywright\README.md` (upstream POM source repo shape)

**Files scanned:** 14 source documents (current repo: 6 docs + 1 manifest; planning: 7; sibling reference: ~3 referenced)

**Pattern extraction date:** 2026-05-12

---

*Phase: 05-showcase-docs-recruiter-polish*
*Pattern mapping: 2026-05-12*
