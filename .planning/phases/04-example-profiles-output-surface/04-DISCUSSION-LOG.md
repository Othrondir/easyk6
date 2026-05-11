# Phase 4: Example Profiles & Output Surface - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `04-CONTEXT.md` — this log preserves the alternatives considered.

**Discussion held:** 2026-05-11
**Mode:** standard (config `workflow.discuss_mode = "discuss"`, no `--auto` / `--all` / `--batch` / `--analyze` flags)

---

## Area selection

**Question:** Phase 4 gray areas — which to discuss for Example Profiles & Output Surface? (multi-select)

Options presented:
1. Load profile shape — VU/duration pattern, threshold relaxation, scenario reuse
2. Capacity profile shape — breaking-point vs throughput-ceiling, executor, threshold semantics
3. Output surface PROF-04 — markdown vs JSON vs HTML, when emitted, content scope, file path
4. Example labeling strategy — README disclaimer, npm scripts, folder, runtime warning

**User selected:** Load profile shape (only)

After Load was scoped, user was asked whether to explore the other 3 areas now or lock load only.

**User selected:** Explore the other 3 areas now (Recommended)

→ All four areas were ultimately discussed.

---

## Area 1: Load profile shape

### Q1: Executor pattern
**Question:** Load profile executor pattern — what shape demonstrates load testing to a recruiter without becoming an enterprise example?

Options:
1. ramping-vus stages (Recommended) — Classic 3-stage shape (e.g., 30s ramp 0→5 VUs, 60s hold @5, 30s ramp 5→0)
2. constant-vus fixed window — 5 VUs for 2 min, no ramp
3. constant-arrival-rate (throughput) — Drive N iters/sec for a window

**User selected:** ramping-vus stages (Recommended) → D-01

### Q2: Scenario reuse
**Question:** Which scenario(s) does the load profile run inside each VU iteration?

Options:
1. Reuse home-smoke via -e SCENARIO= (Recommended)
2. Reuse home-smoke + blog-post-smoke at random per iter
3. Load-specific scenario in registry (e.g., 'load-mixed')

**User selected:** Reuse home-smoke via -e SCENARIO= (Recommended) → D-02

### Q3: Threshold strategy
**Question:** Load profile thresholds — reuse smoke D-66, loosen them, or shift to load-relevant metrics?

Options:
1. Loosen D-66 + add http_req_duration (Recommended) — LCP p(95)<4000, http_req_failed rate<0.05, iteration_duration p(95)<25000, NEW http_req_duration p(95)<2000
2. Reuse D-66 verbatim (no relax) — Brittle under concurrency
3. Load-only metric set (drop browser_web_vital_lcp)

**User selected:** Loosen D-66 + add http_req_duration (Recommended) → D-03

### Q4: VU count + stage durations
**Question:** Stage shape — how many VUs and how long? Local-first constraint means recruiter laptop runs this.

Options:
1. 30s→5, 60s@5, 30s→0 (~2 min, Recommended) — 5 max VUs, laptop-friendly
2. 60s→10, 120s@10, 60s→0 (~4 min)
3. 15s→3, 30s@3, 15s→0 (~1 min)

**User selected:** 30s→5, 60s@5, 30s→0 (~2 min, Recommended) → D-01 (stages parameter)

---

## Area 2: Capacity profile shape

### Q1: Capacity semantics
**Question:** Capacity profile semantics — what does PASS mean for a capacity example test?

Options:
1. Find-the-breaking-point (Recommended) — Threshold breach = SIGNAL, not failure
2. Sustain-the-target (capacity floor)
3. Two-phase: ramp then hold at near-ceiling

**User selected:** Find-the-breaking-point (Recommended) → D-05

### Q2: Capacity executor
**Question:** Capacity executor — ramping shape that finds the breaking point?

Options:
1. ramping-arrival-rate (req/s ramp, Recommended) — throughput is the X axis
2. ramping-vus aggressive
3. constant-arrival-rate (no ramp)

**User selected:** ramping-arrival-rate (req/s ramp, Recommended) → D-06

### Q3: Ramp parameters
**Question:** Capacity ramp parameters — target rate range + preAllocatedVUs cap (chromium-heavy, local-laptop friendly)?

Options:
1. 0→10 iter/s over 3 min, preAllocVUs=10 (Recommended) — ~3 GB peak, likely trips ~8-10 iter/s mark
2. 0→30 iter/s over 5 min, preAllocVUs=20 — risks OOM on 16 GB laptops
3. 0→5 iter/s over 90s, preAllocVUs=5 — too light to trip anything

**User selected:** 0→10 iter/s over 3 min, preAllocVUs=10 (Recommended) → D-07

### Q4: Thresholds + abort policy
**Question:** Capacity thresholds — soft or hard? abortOnFail behavior?

Options:
1. Soft thresholds, no abortOnFail (Recommended) — Run completes full ramp, breaches captured in summary
2. Hard thresholds + abortOnFail=true — Saves time, loses curve visualization
3. No threshold values (informational only)

**User selected:** Soft thresholds, no abortOnFail (Recommended) → D-08

---

## Area 3: Output surface (PROF-04)

### Q1: Output format
**Question:** PROF-04 output format — what does the recruiter open after npm run smoke?

Options:
1. Markdown + JSON (Recommended) — .md for human, .json for tool consumption
2. Markdown only — single artifact, no raw-data path
3. k6 built-in HTML + Markdown — requires jslib dependency
4. Markdown + JSON + raw stdout transcript — overkill

**User selected:** Markdown + JSON (Recommended) → D-09

### Q2: When emitted
**Question:** When does PROF-04 emit reports/ — every k6 run, only smoke, or opt-in flag?

Options:
1. Every run, all profiles (Recommended) — shared lib/simulations/lib/summary.ts
2. Smoke only — literal reading of PROF-04 wording
3. Opt-in via --report CLI flag

**User selected:** Every run, all profiles (Recommended) → D-10

### Q3: Markdown content
**Question:** Markdown summary content — what goes in reports/<profile>-summary.md?

Options:
1. Curated narrative + key metrics (Recommended) — Header + Thresholds table + Key Metrics table + "What ran" + footer linking to .json
2. Full k6 console text dump in markdown code block — dense, recruiter spends 2 min decoding
3. k6-summary-default + threshold callouts — pulls in jslib

**User selected:** Curated narrative + key metrics (Recommended) → D-11

### Q4: File naming
**Question:** File naming/path — how do reports/ filenames distinguish runs?

Options:
1. Overwrite: reports/<profile>-<scenario>.md/.json (Recommended)
2. Timestamped: reports/<profile>-<scenario>-<YYYYMMDD-HHmm>.md — accumulates clutter
3. Per-run dir: reports/<timestamp>/<profile>-<scenario>.{md,json} — overkill

**User selected:** Overwrite: reports/<profile>-<scenario>.md/.json (Recommended) → D-12

---

## Area 4: Example labeling strategy

### Q1: Primary mechanism
**Question:** Primary signal that smoke=supported and load/capacity=illustrative examples — where does a recruiter first notice the distinction?

Options:
1. npm script naming + README table (Recommended) — `npm run smoke` vs `npm run example:load`/`npm run example:capacity`
2. Folder split: lib/simulations/ vs lib/simulations/examples/ — heavier plumbing change
3. In-file banner comment only — low signal, hidden until file opened
4. Runtime stderr warning — annoying when recruiter DOES want to run the example

**User selected:** npm script naming + README table (Recommended) → D-13

### Q2: Secondary signal
**Question:** Secondary signal at the code level — add an in-file banner to lib/simulations/load.ts + capacity.ts?

Options:
1. Yes — short JSDoc banner (Recommended) — `/** EXAMPLE PROFILE — load testing shape. ... See README §Profiles. */`
2. No — README table is enough
3. Yes, plus mirror in lib/simulations/smoke.ts saying 'SUPPORTED DEMO PATH'

**User selected:** Yes — short JSDoc banner (Recommended) → D-14

### Q3: README placement
**Question:** Where in README does the Supported-vs-Example framing live?

Options:
1. Quickstart section, prominent table (Recommended) — top of README, before install steps
2. Dedicated 'Profiles' subsection deeper in README
3. Both — top-of-README one-liner + Profiles section

**User selected:** Quickstart section, prominent table (Recommended) → D-15

### Q4: handleSummary helper architecture
**Question:** Where does the shared handleSummary helper live so smoke + load + capacity all reuse it consistently?

Options:
1. lib/simulations/lib/summary.ts — export handleSummary factory (Recommended) — `makeHandleSummary(profileMetadata)` returning a handleSummary function
2. Inline handleSummary in each simulation file — 3x duplication, drift risk
3. lib/output/summary.ts + handleSummary thin wrapper — yet another top-level lib subdir

**User selected:** lib/simulations/lib/summary.ts — export handleSummary factory (Recommended) → D-16

---

## Closing

**Question:** 16 questions answered across Load / Capacity / Output / Labeling. Ready to write CONTEXT.md?

Options:
1. Write CONTEXT.md (Recommended)
2. One more area / question first
3. Revisit a locked decision

**User selected:** Write CONTEXT.md (Recommended)

→ `04-CONTEXT.md` written. 19 decisions captured (D-01..D-19). 7 deferred ideas catalogued.
