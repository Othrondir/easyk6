# Phase 5: Showcase Docs & Recruiter Polish - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-12
**Phase:** 05-showcase-docs-recruiter-polish
**Areas discussed:** Doc inventory & scope

---

## Gray Area Selection

User selected 1 of 4 offered areas.

| Option | Description | Selected |
|--------|-------------|----------|
| Doc inventory & scope | What files exist after Phase 5; rewrite/delete decisions for README, QUICKSTART, CONTRIBUTING, PROJECT_STRUCTURE; new ARCHITECTURE.md location | ✓ |
| Architecture narrative (DOCS-02) | ARCHITECTURE.md structure, sections, diagram-or-text decisions | |
| README shape + demo evidence | Recruiter first-30-seconds framing, lede, demo-evidence excerpts, TOC, badges | |
| Legacy & stale cleanup | `legacy-js/` keep/move/delete; carry-forward F-01/F-02/BUILD-02/SCEN-02 surfacing | |

**Note:** Architecture narrative + README shape + Legacy cleanup were partially absorbed into the Doc inventory area through follow-up questions (ARCHITECTURE.md sectioning, README rewrite scope, legacy-js disposition, PROJECT_STRUCTURE.md disposition). Demo-evidence framing and badges were left to Claude's Discretion.

---

## Doc inventory & scope

### Q1 — Final canonical doc set

| Option | Description | Selected |
|--------|-------------|----------|
| Lean: README + ARCHITECTURE | Two-file core; delete pre-adaptation QUICKSTART + CONTRIBUTING; fold PROJECT_STRUCTURE into ARCHITECTURE | ✓ |
| Full classic OSS set | README + QUICKSTART + CONTRIBUTING + PROJECT_STRUCTURE + ARCHITECTURE | |
| Single README mega-doc | Everything inline in one file with deep TOC | |

**User's choice:** Lean: README + ARCHITECTURE
**Notes:** Locks D-01.

### Q2 — Where does ARCHITECTURE.md live

| Option | Description | Selected |
|--------|-------------|----------|
| Repo root, flat | Next to README.md and CLAUDE.md; no docs/ subdir | ✓ |
| `docs/` subdirectory | Cleaner repo root long-term; one extra navigation hop | |
| Section inside README | No separate file; H2 section in README | |

**User's choice:** Repo root, flat
**Notes:** Locks D-04.

### Q3 — `QUICKSTART.md` disposition

| Option | Description | Selected |
|--------|-------------|----------|
| Delete | Quickstart already in README §Quickstart with Phase 4 Supported-vs-Example table; standalone file is duplicative | ✓ |
| Rewrite to new shape | Keep file, rewrite for current architecture | |
| Move to `legacy-js/` | Archive as historical reference | |

**User's choice:** Delete
**Notes:** Locks D-02.

### Q4 — `CONTRIBUTING.md` disposition

| Option | Description | Selected |
|--------|-------------|----------|
| Delete | Recruiter-facing portfolio repo, not OSS project; wrong frame | ✓ |
| Rewrite minimal | Slim 20-line version with dev setup, signals process discipline | |
| Move to `legacy-js/` | Archive | |

**User's choice:** Delete
**Notes:** Locks D-03.

### Q5 — `PROJECT_STRUCTURE.md` disposition

| Option | Description | Selected |
|--------|-------------|----------|
| Fold into ARCHITECTURE.md | Layout + boundary definitions become a section in ARCHITECTURE.md, delete standalone | ✓ |
| Refresh in place | Keep file, rewrite for current shape | |
| Delete + brief tree in README | Drop file, small tree block under README Architecture section | |

**User's choice:** Fold into ARCHITECTURE.md
**Notes:** Locks D-05.

### Q6 — README rewrite scope

| Option | Description | Selected |
|--------|-------------|----------|
| Full rewrite | Top-to-bottom; Phase 4 Quickstart table preserved verbatim | ✓ |
| Incremental refresh | Surgical edits to stale Phase 1 framing | |
| Hybrid: keep table + sections, rewrite prose | Preserve headings + table verbatim; rewrite prose underneath | |

**User's choice:** Full rewrite
**Notes:** Locks D-06. Phase 4 Quickstart Supported-vs-Example table preserved verbatim per D-13/D-15 from Phase 4 CONTEXT.

### Q7 — ARCHITECTURE.md section set

| Option | Description | Selected |
|--------|-------------|----------|
| 5 sections: adapted / simplified / upstream / k6 caveats / decisions | Full DOCS-02 coverage | ✓ |
| Lean 3 sections | Adapted + Simplified + Upstream reuse pipeline; drops caveats + decision log | |
| Decision-log-centric | Lead with chronological log, supporting narrative after | |

**User's choice:** 5 sections: adapted / simplified / upstream / k6 caveats / decisions
**Notes:** Locks D-07. Section order: Adapted from `ir-perf-k6` → Simplified on purpose → Upstream reuse pipeline → k6 1.5 runtime caveats → Decision log.

### Q8 — `legacy-js/` disposition

| Option | Description | Selected |
|--------|-------------|----------|
| Keep + document why | Preserve current state; short note in ARCHITECTURE.md explaining the boundary | ✓ |
| Delete | Cleaner repo root; loses before/after comparison artifact | |
| Move under `archive/` or `examples/legacy/` | Rename for clarity | |

**User's choice:** Keep + document why
**Notes:** Locks D-08. Reinforces Phase 1 archival decision.

---

## Claude's Discretion

- Inline `reports/*.md` excerpt in README to make smoke-run output tangible
- Small ASCII directory tree in README (separate from ARCHITECTURE.md's full tree)
- Badges in README (Node, k6, license, build status)
- Tone of ARCHITECTURE.md (first-person engineering narrative vs third-person reference)
- `docs/` cross-link block at README footer pointing into `.planning/`
- Exact wording of the Grafana-deferred note (required to exist; phrasing flexible)
- `package.json` `description` field refresh
- `CLAUDE.md` Conventions/Architecture placeholder sections refresh

---

## Deferred Ideas

- `docs/` subdirectory (rejected in D-04)
- Rewritten `CONTRIBUTING.md` (rejected in D-03)
- Rewritten `QUICKSTART.md` (rejected in D-02)
- Screenshots / GIFs of smoke run
- Closing BUILD-02 / SCEN-02 checkboxes (Phase 5 surfaces honestly; future cycle implements)
- Closing F-01 / F-02 (same as above)
- Formal `docs/ADRs/` directory
- CI/CD smoke-on-PR (FRAME-02 v2)
- Grafana / OTEL integration (OBS-01, OBS-02 v2)
- Multi-upstream support (FRAME-03 v2)
