# EasyK6

EasyK6 is a recruiter-facing k6 browser performance framework that reuses Playwright page objects as the long-term upstream model while keeping the local developer experience simple. One Playwright POM source — `easyPlaywright` — powers maintainable k6 browser smoke tests through a clean architecture you can read, trust, and run locally.

## Quickstart

Smoke is the supported demo path; load and capacity are illustrative examples sharing the same architecture.

| Command | Status | What it does |
|---|---|---|
| `npm run smoke` | **Supported** | Default smoke profile against the demo target (recruiter demo path). |
| `npm run example:load` | _Example_ | Illustrative load profile (ramping-vus, 5 VUs, ~2 min). |
| `npm run example:capacity` | _Example_ | Illustrative capacity profile (ramping-arrival-rate, find-the-ceiling, ~3 min). |

All three profiles write recruiter-readable artifacts to `reports/<profile>-<scenario>.md` + `reports/<profile>-<scenario>.json` (gitignored).

## Upstream Reuse

The repo treats `easyPlaywright` as the permanent upstream Page Object source. The flow is linear:

1. `npm run sync:src` — copy `easyPlaywright/src/pages/` into `easyk6/src/pages/` (idempotent; wipes the local folder before copy).
2. `npm run convert-pages` — produce k6-safe modules under `lib/pages/`.
3. `lib/pages-k6-patches/` — k6-only methods that survive every re-sync / re-convert cycle.

Run sync against a sibling clone (default), an arbitrary path (`--source ./fork`), or a remote (`--repo https://github.com/Othrondir/easyPlaywright.git --branch main`). Pass `--yes` or set `CI=1` to skip the confirmation prompt before the wipe.

## Commands

```bash
npm install
npm run build
npm run validate:build
npm run smoke
npm run perf
npm run sync:src
npm run convert-pages
```

- `npm run smoke` is the supported recruiter demo path; it runs the smoke profile against the demo target with explicit `--demo`.
- `npm run example:load` and `npm run example:capacity` run the illustrative profiles (see Quickstart).
- `npm run perf` exposes the shared runtime-config CLI grammar (`--profile`, `--scenario`, `--base-url`, `--demo`, `--dry-run`) for real-target overrides.
- `npm run sync:src` mirrors upstream `easyPlaywright/src/pages/` into local `src/pages/` and writes `.sync-meta.json`.
- `npm run convert-pages` converts synced POMs in `src/pages/` into k6-safe modules under `lib/pages/`, preserving `lib/pages/base/` and concatenating any matching `lib/pages-k6-patches/<rel>.k6-patch.ts` fragment.
- `npm run build` and `npm run validate:build` cover the Vite bundle and the required-files emit check.

## Runtime Config

Root config stays intentionally small:

```dotenv
# .env
BASE_URL=https://example.com
```

Runtime precedence is `CLI > .env > shell env > built-in demo defaults`.

Example flows:

```bash
npm run smoke -- --dry-run
npm run perf -- --profile smoke --base-url https://example.com
```

Set `BASE_URL` in your shell and run `npm run perf -- --profile smoke --dry-run` when you want to avoid a `.env` file.

## Architecture

For the design narrative — what was adapted from `ir-perf-k6`, what was simplified, and why — see [ARCHITECTURE.md](ARCHITECTURE.md).

## Legacy Note

The original JavaScript starter remains available under `legacy-js/` for reference and comparison. It is no longer the primary architecture story for this repository.

## Known carry-forward

A small set of items intentionally remains open for transparency over implied completeness:

- **BUILD-02** — runtime-config fail-fast on missing/invalid env is partially implemented (foundation in Phase 1; strict validation remains open). See `ARCHITECTURE.md` §Simplified on purpose / Known limitations.
- **SCEN-02** — smoke real-journey vs demo-target captured real-run evidence in Phase 3 (exit 0, three thresholds pass against `https://othrondir.github.io/QAbbalah/`); the `REQUIREMENTS.md` checkbox is a hygiene gap, not missing work.
- **F-01** — capacity real-run evidence was deferred from Plan 04-02 due to host saturation after the load run. All static gates (unit tests, build, validate, dry-run) are green; closure is one `npm run example:capacity` on a quieter host.
- **F-02** — single-iteration smoke renders `n/a (no samples — browser scenario)` for the LCP Key Metrics row. Informational, non-blocking.
