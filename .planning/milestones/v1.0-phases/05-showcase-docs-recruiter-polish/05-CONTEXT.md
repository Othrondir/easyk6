# Phase 5: Showcase Docs & Recruiter Polish - Context

**Gathered:** 2026-05-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the recruiter-facing documentation surface that lets a technical reviewer understand the EasyK6 adaptation in under five minutes and run smoke locally with confidence. Owns DOCS-01 (README/quickstart explains upstream reuse + smoke demo path) and DOCS-02 (architecture docs explain what was adapted from `ir-perf-k6` and what was intentionally simplified). Closes the v1 milestone.

This phase produces docs and polish only — no runtime/code changes beyond doc-driven housekeeping (e.g., deleting stale docs). The Phase 4 Quickstart Supported-vs-Example table already shipped in `README.md` and stays verbatim.

**Out of scope:**
- Any change to runtime code under `lib/`, `scripts/`, `src/`, or build config — Phase 5 is docs polish, not feature work
- Grafana / OTEL / observability integration (PROJECT.md "Out of Scope" — documented as deferred, not implemented)
- CI/CD setup (FRAME-02, v2 requirement)
- Closing pending v1 requirements BUILD-02 / SCEN-02 / F-01 / F-02 — these are surfaced honestly in docs as deferred carry-forward, not retroactively implemented
- A `docs/` subdirectory — flat repo root layout per D-04
- A rewritten `QUICKSTART.md` or `CONTRIBUTING.md` — both are deleted per D-02, D-03
- Inline screenshots/GIFs of the smoke run — not decided in this discussion (planner may include or defer per recruiter-narrative judgment; if added it's a planner choice, not a contract)

</domain>

<decisions>
## Implementation Decisions

### Doc inventory & scope

- **D-01:** Phase 5 lands a **two-file canonical doc set**: rewritten `README.md` (recruiter quickstart + upstream-reuse narrative + commands + smoke-first framing + deferred-Grafana note) AND new `ARCHITECTURE.md` (ir-perf-k6 adaptation narrative + simplifications + decision log). Two top-level docs are the entire user-facing doc surface for v1. No `docs/` subdir, no QUICKSTART, no CONTRIBUTING.
- **D-02:** `QUICKSTART.md` is **deleted**. Its content is stale (references deleted `tests/smoke/basic-smoke.test.js` and pre-adaptation JS POMs from the original starter). The Phase 4 Quickstart §Supported-vs-Example table in `README.md` already serves the quickstart role. A standalone QUICKSTART file duplicates without adding signal.
- **D-03:** `CONTRIBUTING.md` is **deleted**. This is a recruiter-facing portfolio repo, not an OSS project accepting external PRs. A CONTRIBUTING file sets the wrong frame. The maintainer's workflow is captured in `CLAUDE.md` + `.planning/` and stays there.
- **D-04:** `ARCHITECTURE.md` lives at **repo root, flat** (next to `README.md` and `CLAUDE.md`). No `docs/` subdirectory is created. Recruiter sees the file in the GitHub file list immediately; matches existing flat layout.
- **D-05:** `PROJECT_STRUCTURE.md` is **folded into `ARCHITECTURE.md`** as a layout/boundary-definitions section, then **deleted** as a standalone file. The Phase 1-era references inside it (`smoke-shell.test.ts`, "Phase 2 next plan") are obsolete; the boundary labels (`src/pages = synced upstream`, `lib/pages = generated k6-compatible output`, `lib/pages-k6-patches = persistent k6-only overrides`, `legacy-js = archived starter reference`) are valuable and carry into the ARCHITECTURE.md layout section verbatim or close to it.
- **D-06:** `README.md` gets a **full rewrite** top-to-bottom around the recruiter-first framing. The Phase 4 §Quickstart Supported-vs-Example table is **preserved verbatim** (the D-13/D-15 Phase 4 contract is locked). Everything else — lede, upstream-reuse narrative, commands block, runtime-config block, legacy note, "next reference" pointer — is rewritten as one coherent doc. The current "Phase 1 establishes the build foundation…" framing line is removed (it's stale by four phases).
- **D-07:** `ARCHITECTURE.md` contains **five sections** in this order:
  1. **Adapted from `ir-perf-k6`** — what patterns were lifted: scenario registry (Phase 3), TypeScript/Vite build (Phase 1), profile-keyed runner (Phase 3), handleSummary factory (Phase 4)
  2. **Simplified on purpose** — what was rejected and why: no Kubernetes, no Grafana/OTEL in v1, no cloud k6, no scenario matrix, no enterprise observability — each with one-line "because" linking back to recruiter-readability + local-first constraints
  3. **Upstream reuse pipeline** — `easyPlaywright` → `src/pages/` (sync) → `lib/pages/` (convert) → `lib/pages-k6-patches/` (persist k6-only overrides) end-to-end, with the layout/boundary-definitions content folded from `PROJECT_STRUCTURE.md`
  4. **k6 1.5 runtime caveats** — landmines encoded in code: no global `URL` constructor in goja, system env vars not inherited into `__ENV` (explicit `-e` flags), `exec.test.abort` vs raw throw for fail-fast, k6/browser routes HTTP through chromium (use `browser_http_req_duration` not `http_req_duration`). Each caveat shows how the codebase mitigates it. Reference: Plan 03-02 deviation patch `7d629ba` + Phase 04 RESEARCH §5 Pitfall 1.
  5. **Decision log** — chronological pointer index into `.planning/phases/*-CONTEXT.md`, `.planning/STATE.md` Decisions section, `.planning/PROJECT.md` Key Decisions table. Brief — recruiter can drill in if they want depth; the file itself stays scannable.
- **D-08:** `legacy-js/` is **kept in place** (Phase 1 archival decision stands). A short paragraph in `ARCHITECTURE.md` §1 ("Adapted from `ir-perf-k6`") or §3 ("Upstream reuse pipeline") explicitly says: *"`legacy-js/` preserves the original JavaScript starter for before/after comparison — it is NOT the active codebase."* The deliberate boundary signals engineering judgment (chose adaptation over rewrite-from-zero erasure).

### Claude's Discretion

- Inline sample of a `reports/smoke-home-smoke.md` excerpt in README to make the smoke-run output tangible — useful but not contracted; planner decides whether to embed an excerpt, link to a checked-in sample, or skip
- Whether to include a small ASCII directory tree in README (separate from ARCHITECTURE.md's full tree) — planner judgment per recruiter-scannability tradeoff
- Badges in README (Node version, k6 version, license, build status) — none are required; planner may add 1–3 if they aid recruiter scan, skip if they add visual noise
- Tone of ARCHITECTURE.md (first-person engineering narrative vs third-person reference doc) — planner picks whichever reads cleaner against the 5-section structure
- Whether to add a `docs/` cross-link block at the bottom of README pointing into `.planning/` (recruiter-curious path) — not contracted; planner judgment
- Exact wording of the Grafana-deferred note — required to exist per success-criterion #3, but exact phrasing is Claude's call
- Whether to update `package.json` `description` field from "K6 Performance Testing Framework with POM (Page Object Model) architecture" to something recruiter-tuned — minor polish, planner judgment
- Whether to refresh `CLAUDE.md` Conventions/Architecture sections (currently "not yet established"/"not yet mapped" placeholders) — strictly speaking a maintainer-tooling file, but if planner judges it's recruiter-visible during repo inspection, a one-pass refresh fits the polish theme

### Carry-forward surfaced honestly (transparency over implied completeness)

- **D-09:** Pending v1 items NOT closed by Phase 5 must be visible to a recruiter inspecting the repo, but Phase 5 does NOT retroactively implement them:
  - **BUILD-02** (runtime config fail-fast on missing/invalid env) — REQUIREMENTS.md still shows `[ ]`; Phase 1 closed the foundation, BUILD-02 itself wasn't closed by Phase 1 closing
  - **SCEN-02** (smoke scenarios run real journeys vs demo target using reused POMs) — REQUIREMENTS.md still shows `[ ]` even though Phase 3 P02 captured real-run smoke evidence against QAbbalah; this is a checkbox-hygiene gap, not missing work
  - **F-01** (capacity real-run deferred from Plan 04-02 due to PC saturation; static gates all green)
  - **F-02** (smoke single-iteration LCP renders `n/a` in Key Metrics row; informational, non-blocking)
  Phase 5 plan addresses these EITHER as (a) honest "known carry-forward" mentions in README (recommended — shows engineering judgment), OR (b) a short "Known limitations & deferred work" section in ARCHITECTURE.md §2 ("Simplified on purpose"), OR (c) both. Planner's call which surface(s) — but they MUST be surfaced somewhere visible, not hidden.

### Plan structure

- **D-10:** Phase 5 is **one plan** per ROADMAP.md (`05-01-PLAN.md`). Planner may organize into waves but the deliverable set is fixed by D-01..D-09: rewritten README + new ARCHITECTURE.md + deletion of QUICKSTART.md + deletion of CONTRIBUTING.md + deletion of PROJECT_STRUCTURE.md (after folding its content). The Phase 4 Quickstart table inside README stays untouched (verbatim preservation).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase + product framing
- `.planning/PROJECT.md` — vision, Core Value, Out-of-Scope list (Grafana/OTEL/k8s/multi-upstream), Key Decisions table that the ARCHITECTURE.md decision log indexes into
- `.planning/REQUIREMENTS.md` — DOCS-01 + DOCS-02 wording; status of BUILD-02 / SCEN-02 (still `[ ]`); v2 requirements list (OBS-01/02, FRAME-01/02/03) that the Grafana-deferred note + "Simplified on purpose" section reference
- `.planning/ROADMAP.md` §"Phase 5: Showcase Docs & Recruiter Polish" — phase goal, 4 success criteria, dependency on Phase 4
- `.planning/STATE.md` — current position; F-01 / F-02 carry-forward to surface in docs per D-09
- `CLAUDE.md` — recruiter-readable + local-first constraints; Technology Stack section that ARCHITECTURE.md §1 references; the "What NOT to Use" table that informs ARCHITECTURE.md §2 ("Simplified on purpose")

### Locked decisions from prior phases (carry-forward into doc narrative)
- `.planning/phases/01-foundation-project-shape/01-CONTEXT.md` — Phase 1 layout decisions, demo target URL (QAbbalah), CLI > .env > demo precedence, `legacy-js/` archival decision
- `.planning/phases/02-upstream-sync-k6-adaptation/02-CONTEXT.md` — sync-src + convert-pages + patch-injection pipeline that ARCHITECTURE.md §3 narrates
- `.planning/phases/03-smoke-scenarios-supported-execution/03-CONTEXT.md` — scenario registry, profile-keyed `resolveEntryFile`, D-66 thresholds, the k6 1.5 caveats encoded in code (no global URL, env-flag plumbing, exec.test.abort) that ARCHITECTURE.md §4 documents
- `.planning/phases/03-smoke-scenarios-supported-execution/03-02-SUMMARY.md` — 4 Plan 03-01 runtime deviations documented in detail; ARCHITECTURE.md §4 cites these as evidence the caveats are real
- `.planning/phases/04-example-profiles-output-surface/04-CONTEXT.md` — D-13 + D-15 README Quickstart 3-row table (PRESERVE VERBATIM per D-06 here), D-16 makeHandleSummary factory architecture, PROF-04 artifact contract, F-01 + F-02 carry-forward
- `.planning/phases/04-example-profiles-output-surface/04-RESEARCH.md` §5 Pitfall 1 — `browser_http_req_duration` vs `http_req_duration` evidence that ARCHITECTURE.md §4 ("k6 1.5 caveats") cites

### Current doc surface Phase 5 modifies
- `README.md` — FULL REWRITE per D-06; preserve §Quickstart table from Phase 4 verbatim
- `QUICKSTART.md` — DELETE per D-02 (stale references to pre-adaptation JS layout)
- `CONTRIBUTING.md` — DELETE per D-03 (wrong frame for recruiter-facing portfolio repo)
- `PROJECT_STRUCTURE.md` — FOLD into ARCHITECTURE.md per D-05, then DELETE
- `ARCHITECTURE.md` — NEW file at repo root per D-04, 5 sections per D-07
- `.gitignore` — verify `reports/` stays gitignored (Phase 4 already); no change expected
- `package.json` — no required changes (planner may polish `description` field per Claude's Discretion)
- `legacy-js/` — UNTOUCHED; documented in ARCHITECTURE.md per D-08

### Recruiter-facing reference targets (the docs describe these)
- `https://othrondir.github.io/QAbbalah/` — demo target locked in Phase 1; README + ARCHITECTURE both reference it
- `https://github.com/Othrondir/easyPlaywright` — permanent upstream POM source per PROJECT.md
- `../easyPlaywright/` — local sibling clone used by `npm run sync:src` default

### k6 / ecosystem references that may appear in ARCHITECTURE.md §4 caveats
- `https://grafana.com/docs/k6/latest/using-k6-browser/` — browser module overview
- `https://grafana.com/docs/k6/latest/using-k6/javascript-typescript-compatibility-mode/` — goja runtime limits (no global URL, partial TS support → bundling rationale)
- `https://grafana.com/docs/k6/latest/results-output/end-of-test/custom-summary/` — handleSummary contract that Phase 4 D-16 wraps

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`README.md` §Quickstart Supported-vs-Example table** — Phase 4 D-13/D-15 contract. Preserve verbatim during D-06 full rewrite.
- **`PROJECT_STRUCTURE.md` boundary-label block** — `src/pages = synced upstream`, `lib/pages = generated`, `lib/pages-k6-patches = persistent k6-only`, `legacy-js = archive` — fold into ARCHITECTURE.md §3 per D-05 with refreshed framing.
- **`CLAUDE.md` Technology Stack table** — pinned versions (k6 1.5.x, Node 22.x, TS 5.9.x, Vite 5.4.x), "Alternatives Considered" table, "What NOT to Use" table — natural source material for ARCHITECTURE.md §1 (Adapted) + §2 (Simplified on purpose).
- **`.planning/STATE.md` Decisions block** — chronologically ordered key decisions from init through Phase 4 — ARCHITECTURE.md §5 (Decision log) is essentially a curated, recruiter-readable index into this list.
- **Phase 03-02 SUMMARY.md + Phase 03-02 deviation commit `7d629ba`** — concrete evidence of k6 1.5 caveats. ARCHITECTURE.md §4 cites these (don't re-prove; link).
- **Phase 04 RESEARCH.md §5 Pitfall 1** — `browser_http_req_duration` evidence. Same — link, don't re-prove.

### Established Patterns
- **Recruiter-readable + local-first constraints (CLAUDE.md)** — every doc-shape decision in Phase 5 must align: no enterprise framing, no cloud assumptions, no internal-context-required jargon.
- **Smoke-first framing (Phase 4 D-13/D-15)** — the Supported-vs-Example labeling pattern lives at the npm-script + README-table + JSDoc-banner layers. Phase 5 prose around the table reinforces but does NOT relitigate the labeling.
- **Decision-log discipline (Phases 1–4)** — every implementation choice has a CONTEXT.md decision ID + STATE.md Decisions entry + (often) a SUMMARY.md provenance line. ARCHITECTURE.md §5 indexes this discipline; it doesn't reinvent it.
- **Out-of-Scope honesty (PROJECT.md)** — Grafana/OTEL/k8s/multi-upstream are out of scope and the docs say so plainly. Phase 5 must surface deferred work explicitly per D-09, not implicitly.

### Integration Points
- `README.md` rewrite ↔ Phase 4 Quickstart table (preserve verbatim)
- `ARCHITECTURE.md` §3 (Upstream reuse pipeline) ↔ folded `PROJECT_STRUCTURE.md` layout content
- `ARCHITECTURE.md` §4 (k6 1.5 caveats) ↔ Phase 03-02 SUMMARY + Phase 04 RESEARCH (cite, don't duplicate)
- `ARCHITECTURE.md` §5 (Decision log) ↔ `.planning/STATE.md` + `.planning/phases/**/CONTEXT.md` (index, don't duplicate)
- Deleted files (`QUICKSTART.md`, `CONTRIBUTING.md`, `PROJECT_STRUCTURE.md`) ↔ any remaining cross-references in `README.md` or `CLAUDE.md` must be removed in the same plan to avoid dangling links

### Creative Options
- A small "Run smoke in 90 seconds" code block at the top of README — combines `npm install`, `npm run smoke`, expected exit-zero line — gives recruiter a copy-paste-runnable demo path with no scrolling
- Inline excerpt from a real `reports/smoke-home-smoke.md` (committed as a doc-only sample under `.planning/` or inline as a fenced markdown block) — makes PROF-04's recruiter-readable artifact tangible without requiring the recruiter to run k6
- ARCHITECTURE.md §1 could end with a one-line "what got dropped" callout for each lifted pattern (e.g., "Scenario registry: KEPT. Multi-team scenario matrix: DROPPED — see §2") — reinforces the simplification narrative pattern

</code_context>

<specifics>
## Specific Ideas

- The README rewrite (D-06) is graded on the recruiter's first 30 seconds — lede + Quickstart table + clear smoke-first signal must all land above-the-fold when the file renders on GitHub.
- ARCHITECTURE.md §2 ("Simplified on purpose") is the section that demonstrates engineering judgment most directly. Each "we did NOT include X because Y" line is a hiring-signal sentence. Don't bury them.
- The decision log in ARCHITECTURE.md §5 should INDEX `.planning/`, not duplicate it. Bullet shape: *"Phase 3 — chose `exec.test.abort` over raw throw for fail-fast (k6 1.5 reports exit 0 on threshold-pass even with thrown errors). See `.planning/phases/03-smoke-scenarios-supported-execution/03-02-SUMMARY.md`."*
- "Polished rather than experimental" (success criterion #4) is the hardest to objectively grade. Heuristic: no stale-Phase-N framing, no broken cross-references, no dangling "Phase 2 next plan" notes, no `pages/YourPage.js`-era examples, consistent voice across README + ARCHITECTURE.

</specifics>

<deferred>
## Deferred Ideas

- **`docs/` subdirectory** — rejected in D-04 in favor of flat repo root. Future milestone could introduce if doc count grows past 3–4 files.
- **Rewritten `CONTRIBUTING.md`** — rejected in D-03. If the repo ever flips from "portfolio showcase" to "OSS project accepting PRs", add then.
- **Rewritten `QUICKSTART.md`** — rejected in D-02. Quickstart lives in README §Quickstart.
- **Screenshots / GIFs of smoke run** — left to planner's Claude's-Discretion call. Future polish pass could add a hosted GIF if recruiter feedback says text-only is too dry.
- **Closing BUILD-02 / SCEN-02 checkboxes in REQUIREMENTS.md** — Phase 5 is docs-only; D-09 surfaces these as honest carry-forward in docs rather than retroactively implementing or hiding them. If a future minor cycle wants to close them, it's a separate phase.
- **Closing F-01 (capacity real-run evidence) / F-02 (smoke LCP `n/a`)** — same as above. Surfaced in docs per D-09; not implemented in Phase 5.
- **`docs/ADRs/` formal ADR directory** — the decision log in ARCHITECTURE.md §5 indexes informal CONTEXT.md decisions instead. Future milestone could formalize if the project grows.
- **CI/CD smoke-on-PR (FRAME-02)** — v2 requirement, out of scope.
- **Grafana / OTEL integration (OBS-01, OBS-02)** — v2 requirement; documented as deferred in v1 docs per D-09.
- **Multi-upstream support (FRAME-03)** — v2 requirement; `easyPlaywright` is permanent v1 upstream.

### Reviewed Todos (not folded)
None — no pending todos surfaced in cross-reference for Phase 5.

</deferred>

---

*Phase: 05-showcase-docs-recruiter-polish*
*Context gathered: 2026-05-12*
