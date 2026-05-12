# EasyK6 Architecture

This is the design-narrative companion to `README.md`. It documents what was adapted from the reference `ir-perf-k6` repo, what was deliberately simplified for recruiter readability, how the upstream Playwright Page Object pipeline is wired, the k6 1.5 runtime caveats that are encoded directly in code, and a one-line-per-decision index into `.planning/` for reviewers who want to drill deeper. It is aimed at a technical reviewer who wants to know *what was adapted*, *what was simplified*, and *why*.

## Adapted from `ir-perf-k6`

EasyK6 reuses a small, deliberately chosen slice of the patterns proven in the sibling `ir-perf-k6` repo. Each lifted pattern arrived in a specific phase, with a deliberate "what got dropped" line so the simplification narrative in §2 is not left to do all the work.

- **Scenario registry (Phase 3)** — `lib/scenarios/index.ts` exports `SCENARIO_REGISTRY` as a `Record<string, Scenario>` keyed by kebab-case IDs (`home-smoke`, `blog-post-smoke`). The runtime reads `__ENV.SCENARIO` and dispatches into the registry. **What got dropped:** the multi-team scenario matrix from `ir-perf-k6`. Two scenarios are enough to prove the registry shape; more breadth without more depth would dilute the recruiter signal.
- **TypeScript / Vite build pipeline (Phase 1)** — `vite.config.ts` + `tsconfig.json` give a typed source surface that bundles to k6-runnable JavaScript under `dist/`. This is the proven path because k6's native TypeScript support is partial and goja's Node-style resolution is limited. **What got dropped:** Docker-image-as-default-execution-path. EasyK6 runs on a laptop with locally installed k6; the Docker image is an optional alternative, not the canonical path.
- **Profile-keyed runner (Phase 3)** — `scripts/perf-runner.mjs` resolves entry files via `resolveEntryFile(profile) → dist/simulations/${profile}.js`. Adding a new profile is "author `lib/simulations/<profile>.ts` and add the script to `package.json`" with zero runtime-config changes. **What got dropped:** per-scenario entry files. Profiles, not scenarios, key the build output; scenarios live inside profiles via the registry.
- **`handleSummary` factory (Phase 4)** — `lib/simulations/lib/summary.ts` exports `makeHandleSummary({ profile, scenarioGetter, baseUrlGetter })` composing pure `formatMarkdown` + `formatJson`. Each profile writes recruiter-readable artifacts to `reports/<profile>-<scenario>.md` + `reports/<profile>-<scenario>.json` (gitignored). **What got dropped:** HTML dashboard rendering and k6 Cloud integration. Markdown is enough for a 30-second recruiter scan; HTML adds complexity without adding signal at v1.

`legacy-js/` preserves the original JavaScript starter for before/after comparison — it is NOT the active codebase. The deliberate side-by-side boundary signals engineering judgment (chose adaptation over rewrite-from-zero erasure).

## Simplified on purpose

Six explicit rejections, each with a one-line "because". These are hiring-signal sentences — what the project deliberately did not become is as important as what it did.

- **No Grafana / OTEL integration** — `OBS-01` / `OBS-02` are v2 work. v1 emits `reports/<profile>-<scenario>.md` so a reviewer reads results in 30 seconds without standing up a dashboard.
- **No Kubernetes execution** — local-first showcase scope. `ir-perf-k6` runs in EKS via k6-operator; EasyK6 v1 runs on a laptop and that is the point.
- **No multi-upstream adapter** — `easyPlaywright` is the permanent v1 model. `FRAME-03` opens that surface later.
- **No enterprise scenario matrix** — two scenarios (`home-smoke`, `blog-post-smoke`) prove the registry; more breadth without more depth would dilute the signal.
- **No cloud k6** — local-first holds.
- **No CI/CD smoke-on-PR** — `FRAME-02` is v2 work.

### Known limitations & deferred work

A small set of items intentionally remains open at v1 — surfaced honestly rather than hidden behind implied completeness. Each names where the gap lives and what would close it.

- **BUILD-02** (runtime-config fail-fast on missing/invalid env) — `.planning/REQUIREMENTS.md:18` still shows `[ ]`. Phase 1 closed the foundation; the strict-validation closure was descoped pre-Phase-2 and remains open. See `.planning/STATE.md` for current position.
- **SCEN-02** (smoke real-journey vs demo target) — `.planning/REQUIREMENTS.md:23` still shows `[ ]` despite Phase 03-02 capturing real-run evidence against `https://othrondir.github.io/QAbbalah/` (exit 0, 3/3 D-66 thresholds pass). Checkbox-hygiene gap, not missing work. See `.planning/phases/03-smoke-scenarios-supported-execution/03-02-SUMMARY.md`.
- **F-01** (capacity real-run evidence) — deferred from Plan 04-02 because the recruiter laptop saturated after the load real-run. Static gates green: 7 unit tests, build emits `dist/simulations/capacity.js`, `validate:build` includes the entry, dry-run prints the spawn argv. Closure path: `npm run example:capacity` against the demo target on a quieter host.
- **F-02** (smoke single-iteration LCP `n/a`) — when only one iteration sample fires, the Key Metrics row for `browser_web_vital_lcp` renders the literal string `n/a (no samples — browser scenario)`. Informational, non-blocking. See `.planning/phases/04-example-profiles-output-surface/04-CONTEXT.md` F-02.

## Upstream reuse pipeline

The repo treats `easyPlaywright` as the permanent upstream Page Object source. The pipeline is a linear three-step flow:

1. `npm run sync:src` — copy `easyPlaywright/src/pages/` into `easyk6/src/pages/` (idempotent; wipes the local folder before copy, then writes `src/pages/.sync-meta.json` with source / mode / branch / commit / timestamp).
2. `npm run convert-pages` — transform synced Playwright POMs in `src/pages/` into k6-safe modules under `lib/pages/`. The converter preserves `lib/pages/base/` (the hand-authored `K6Page` + selector shim) and concatenates any matching `lib/pages-k6-patches/<rel>.k6-patch.ts` fragment before the final closing brace.
3. `lib/pages-k6-patches/` — persistent k6-only methods that survive every re-sync / re-convert cycle via `// #endregion` patch injection. This is where k6-specific behavior lives without mutating the upstream POM.

### Repository layout

```text
easyk6/
├── ARCHITECTURE.md                  # this file
├── CLAUDE.md                        # maintainer tooling guidance
├── README.md                        # recruiter entry point
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.config.ts
├── legacy-js/                       # archived JavaScript starter (reference only)
├── lib/
│   ├── config/                      # runtime-config + base-URL normalization
│   ├── pages/                       # generated k6-compatible page objects
│   │   └── base/                    # hand-authored K6Page + selector shim (survives convert wipe)
│   ├── pages-k6-patches/            # persistent k6-only overrides (injected at convert time)
│   ├── scenarios/                   # central scenario registry (index.ts + per-scenario modules)
│   ├── simulations/                 # profile-keyed k6 entrypoints
│   │   ├── lib/                     # goja-safe summary / format-md / format-json
│   │   ├── capacity.ts
│   │   ├── load.ts
│   │   └── smoke.ts
│   └── vendor/                      # vendored k6-only libs (e.g. k6-testing)
├── scripts/
│   ├── convert-pages.mjs            # src/pages → lib/pages transformation orchestrator
│   ├── lib/                         # shared converter helpers (selectors, transforms, patch-injection)
│   ├── perf-runner.mjs              # public CLI shell behind npm run smoke / perf / example:*
│   ├── sync-src.mjs                 # mirrors easyPlaywright/src/pages → src/pages
│   └── validate-build.mjs           # asserts required dist/ artifacts exist post-build
├── src/
│   └── pages/                       # synced upstream Playwright source (regenerated by sync:src)
│       ├── AboutPage.ts
│       ├── BasePage.ts
│       ├── HomePage.ts
│       ├── PostPage.ts
│       ├── components/
│       ├── index.ts
│       └── .sync-meta.json          # upstream provenance (source / mode / branch / commit / syncedAt)
└── tests/
    ├── unit/
    └── integration/
```

`dist/` (Vite build output), `node_modules/`, and `reports/` (runtime artifact directory) are gitignored and not shown in the tree.

### Boundary definitions

- `src/pages` = synced upstream Playwright source (rewritten on every `npm run sync:src`; do not edit by hand).
- `src/pages/.sync-meta.json` = upstream provenance file (recruiter-readable: source path, mode, timestamp, commit).
- `lib/pages` = generated k6-compatible output. `lib/pages/base/` is hand-authored (K6Page + selector shim) and survives the convert wipe.
- `lib/pages-k6-patches` = persistent k6-only overrides; injected at convert time via `// #endregion` patch insertion so they round-trip through sync→convert→re-sync→re-convert without drift.
- `legacy-js` = archived JavaScript starter for before/after comparison.

`legacy-js/` preserves the original JavaScript starter for before/after comparison — it is NOT the active codebase.

### Why each top-level directory exists

- `lib/` holds repository-owned artifacts derived for k6 execution: configuration helpers, generated pages, scenario registry, profile-keyed simulation entrypoints, goja-safe summary helpers, and vendored k6-only libraries (e.g. `k6-testing`).
- `scripts/` holds Node-side ESM helpers behind the public npm command surface. They run under Node, not k6 — so they may use the full Node API. `scripts/lib/` collects converter internals (selectors, transforms, patch injection) reused across `convert-pages.mjs` and its unit tests.
- `src/` holds upstream Playwright material. `src/pages/` is rewritten by `npm run sync:src`; treat it as read-only output of the sync command. The `.sync-meta.json` provenance file gives a recruiter `cat src/pages/.sync-meta.json` visibility into exactly which upstream commit the local POMs came from.
- `legacy-js/` preserves the original JavaScript starter for reference and before/after comparison. It is archived, never imported, and never built.

### Sync provenance

`src/pages/.sync-meta.json` is rewritten on every successful sync. It exposes:

| Field | Mode | Description |
|-------|------|-------------|
| `source` | both | Local path (normalized) or git URL |
| `mode` | both | `'local'` or `'git'` |
| `branch` | git | Git branch passed via `--branch` |
| `commit` | git | Full SHA captured via `git -C <tmp> rev-parse HEAD` post-clone |
| `syncedAt` | both | ISO 8601 UTC timestamp |

Recruiters can `cat src/pages/.sync-meta.json` to see exactly which upstream the local POMs came from without inspecting git history.

## k6 1.5 runtime caveats

Four caveats k6 1.5's goja runtime imposes — each documented because the codebase encodes a mitigation that a future contributor (or recruiter reading the source) would otherwise have to rediscover.

- **No global `URL` constructor** — k6 1.5's goja runtime does not ship `new URL(...)`. Mitigation: `lib/config/runtime-config.ts::normalizeBaseUrl` uses a regex matcher (`^(https?://[^/\s]+)(/.*)?$`) plus bare-host trailing-slash normalization. Any future runtime-side helper that needs URL parsing must use the same regex-driven pattern, not the Web API.
- **System env vars don't reach `__ENV`** — k6 1.5 does NOT inherit shell env vars into `__ENV` without `--include-system-env-vars`. Mitigation: `scripts/perf-runner.mjs::buildK6Args` emits `BASE_URL`, `K6_PROFILE`, `K6_SCENARIO`, `K6_DEMO`, and `SCENARIO` as explicit `-e KEY=VALUE` flags on every spawn. The same builder powers both `printDryRun` and `runK6`, so the dry-run output is byte-faithful to the real spawn.
- **`exec.test.abort` for fail-fast (not raw `throw`)** — k6 1.5 reports exit 0 when all thresholds pass even if the iteration body throws. Mitigation: `lib/simulations/smoke.ts` calls `exec.test.abort(message)` from `k6/execution` before the defensive throw, which triggers k6 exit code 108 → runner re-rejects → npm exit 1. The defensive throw is kept for static-analysis comfort but is unreachable at runtime.
- **Browser scenarios route HTTP through chromium** — `http_req_*` metrics read 0 samples for `k6/browser` scenarios because chromium bypasses the `k6/http` Go client. Mitigation: threshold strings target `browser_http_req_duration` instead (load + capacity profiles per Phase 4 D-03 / D-08 amendment). Evidence: `.planning/phases/04-example-profiles-output-surface/04-RESEARCH.md` §5 Pitfall 1 + Phase 03-02 SUMMARY Run 1 (`http_req_failed: 0.00% 0 out of 0`).

Detailed evidence in `.planning/phases/03-smoke-scenarios-supported-execution/03-02-SUMMARY.md` (Plan 03-02 deviation commit `7d629ba`) and `.planning/phases/04-example-profiles-output-surface/04-RESEARCH.md` §5 Pitfall 1.

## Decision log

A pointer index, not a re-statement. Each bullet is one line plus a `.planning/` pointer; recruiter-curious paths drill into the locked phase decisions from there.

- **[Init]** — `easyPlaywright` is the permanent upstream POM model; smoke is the supported v1 workflow; Grafana / OTEL is deferred to v2. See `.planning/PROJECT.md` Key Decisions.
- **[Phase 1]** — archived the original JavaScript starter under `legacy-js/` and adopted TypeScript-first new architecture. See `.planning/phases/01-foundation-project-shape/01-CONTEXT.md`.
- **[Phase 2]** — built the Node-ESM converter (`scripts/convert-pages.mjs`) and the `lib/pages-k6-patches/` injection mechanism that survives sync→convert→re-sync cycles. See `.planning/phases/02-upstream-sync-k6-adaptation/02-03-SUMMARY.md`.
- **[Phase 3]** — adopted a central scenario registry (`lib/scenarios/index.ts`) with kebab-case IDs and profile-keyed `resolveEntryFile`. See `.planning/phases/03-smoke-scenarios-supported-execution/03-CONTEXT.md`.
- **[Phase 3 deviation]** — codified four k6 1.5 runtime caveats in code (commit `7d629ba`): no global URL, env-flag plumbing, `exec.test.abort` for fail-fast, PostPage selector fallback. See `.planning/phases/03-smoke-scenarios-supported-execution/03-02-SUMMARY.md`.
- **[Phase 4]** — introduced `makeHandleSummary` factory at `lib/simulations/lib/summary.ts` and retargeted threshold strings to `browser_http_req_duration` for load + capacity. See `.planning/phases/04-example-profiles-output-surface/04-CONTEXT.md` D-03 / D-16.

Full chronological decision history lives in `.planning/STATE.md` (Decisions block) and `.planning/phases/<N>-*/<N>-CONTEXT.md` for per-phase locked decisions.
