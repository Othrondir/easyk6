# Phase 2: Upstream Sync & k6 Adaptation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-08
**Phase:** 02-upstream-sync-k6-adaptation
**Areas discussed:** Upstream source mode, Conversion engine, Patch layer mechanism, v1 conversion depth (user delegated all decisions: "Tu decides")

---

## Gray-area selection

| Option | Description | Selected |
|--------|-------------|----------|
| Upstream source mode | Local FS copy vs git clone vs both | ✓ (delegated) |
| Conversion engine choice | Port bash/python vs Node rewrite vs ts-morph AST | ✓ (delegated) |
| Patch layer mechanism | File injection vs subclass override vs unified-diff | ✓ (delegated) |
| v1 conversion depth | Full ir-perf fidelity vs MVP vs staged | ✓ (delegated) |

**User's choice:** "Tu decides" — full delegation to recommended defaults across all four areas.
**Notes:** User reviewed the gray-area menu and explicitly handed every decision to Claude with the recommendation tier preselected. No follow-up discussion was requested. All four areas resolved with the recommended option captured in CONTEXT.md decisions D-22 through D-50.

---

## Upstream source mode

| Option | Description | Selected |
|--------|-------------|----------|
| Local FS copy only | Zero-network, fast, requires sibling checkout | |
| Git clone only | Mirrors ir-perf-k6 exactly, requires network | |
| Both modes (local default, git fallback) | Recruiter-friendly default, portability when needed | ✓ |

**Rationale:** Local default keeps the showcase frictionless; git mode keeps the pipeline portable to a clean checkout where the sibling repo is absent.

---

## Conversion engine

| Option | Description | Selected |
|--------|-------------|----------|
| Port ir-perf-k6 bash + python pipeline as-is | Proven; fragile on Windows | |
| Rewrite as Node.js (regex + balanced-paren walker) | Cross-platform, fits Phase 1 .mjs pattern | ✓ |
| ts-morph AST | Cleanest semantics; adds large dev dependency | |

**Rationale:** Phase 1 already proves the Node ESM script pattern (`scripts/perf-runner.mjs`, `scripts/validate-build.mjs`). Bash + sed pipelines force WSL or Git Bash on a Windows host. ts-morph is overkill for ~5 upstream POMs.

---

## Patch layer mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| File injection before `// #endregion` | Mirrors ir-perf-k6 exactly | ✓ |
| Subclass override of generated POM | Cleaner OO, requires generated layer to expose hooks | |
| Unified-diff patch files | Rigorous; harder for recruiters to read | |

**Rationale:** Recruiter readability wins. Injection is one cat-and-replace step; the patch file is plain TypeScript a reviewer can read.

---

## v1 conversion depth

| Option | Description | Selected |
|--------|-------------|----------|
| Full ir-perf-k6 fidelity | All expect→waitFor, selector rewrites, k6 imports | ✓ |
| MVP enough to compile Phase 3 smoke | Imports + extends K6Page + naive selectors | |
| Staged (basic in 02-02, extend if needed) | Splits work, defers risk | |

**Rationale:** easyPlaywright POMs are small. The showcase value comes from demonstrating real adaptation, not a stub. Doing the full transform once removes Phase 3 friction.

---

## Claude's Discretion

- Internal helper module names within `lib/pages/base/`
- Internal helper functions inside `scripts/sync-src.mjs` and `scripts/convert-pages.mjs`
- Wording of error/progress messages
- Whether the balanced-paren walker is inline or a tiny helper module
- Exact contents of the demonstration k6 patch on `HomePage`

## Deferred Ideas

- Selective conversion mode (only convert POMs imported by k6 scenarios)
- Sync of upstream `src/data/` and `src/fixtures/`
- Generic multi-upstream adapter
- AST-based conversion via ts-morph
- Conversion of upstream `src/tests/` into k6 scenarios
- Patch validation step that diffs generated output before/after injection
