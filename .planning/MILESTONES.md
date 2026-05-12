# Milestones: EasyK6

Running history of shipped milestones. Newest first. Full per-milestone archives live under `.planning/milestones/`.

---

## v1.0 — Recruiter-Ready EasyK6 Adaptation

**Shipped:** 2026-05-12
**Phases:** 1-5 (11 plans)
**Timeline:** 2026-04-23 → 2026-05-12 (~19 days from GSD bootstrap)
**Git range:** `611ed36` → `79554b6`

**Delivered:**
- TypeScript/Vite 5.4 build toolchain replacing the original JS-only starter; legacy archived under `legacy-js/`
- Idempotent `npm run sync:src` from sibling `easyPlaywright` checkout + deterministic `npm run convert-pages` orchestrator with vendored `k6-testing` and survivable `lib/pages-k6-patches/` mechanism (proven round-trip byte-identical)
- Central `SCENARIO_REGISTRY` driving `npm run smoke` (supported demo path) against the live `easyPlaywright` demo target, with real-run threshold-pass evidence
- Example load + capacity profiles in code (`npm run example:load` real-run + `npm run example:capacity` static gates) sharing a single `makeHandleSummary` factory and emitting `reports/<profile>-<scenario>.md` + `.json` artifacts
- Two-file canonical doc set at repo root: `README.md` (rewritten with locked Quickstart Supported-vs-Example table) + `ARCHITECTURE.md` (5-section narrative covering Adapted / Simplified on purpose / Upstream reuse pipeline / k6 1.5 caveats / Decision log)

**Requirements:** 14/15 v1 requirements complete (BUILD-02 carried forward to v2 per D-09 — surfaced honestly in shipped docs rather than retroactively closed).

**Known deferred items at close:**
- BUILD-02 (full env validation surface) → v2 backlog
- F-01 (capacity real-run) → deferred due to single-PC saturation; example-tier requirement still satisfied
- F-02 (LCP `n/a` in smoke single-iteration Key Metrics) → non-blocking k6/browser sample-count behavior

**Archives:**
- [`milestones/v1.0-ROADMAP.md`](milestones/v1.0-ROADMAP.md) — full milestone archive (phase details + key decisions + issues resolved/deferred)
- [`milestones/v1.0-REQUIREMENTS.md`](milestones/v1.0-REQUIREMENTS.md) — frozen requirements snapshot

**Git tag:** `v1.0`
