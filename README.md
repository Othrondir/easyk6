# EasyK6

EasyK6 is a recruiter-facing k6 browser performance framework that reuses Playwright page objects as the long-term upstream model while keeping the local developer experience simple.

Phase 1 establishes the build foundation, repo boundaries, and the shared runtime-config contract behind `npm run smoke` and `npm run perf`.

## Quickstart

Smoke is the supported demo path; load and capacity are illustrative examples sharing the same architecture.

| Command | Status | What it does |
|---|---|---|
| `npm run smoke` | **Supported** | Default smoke profile against the demo target (recruiter demo path). |
| `npm run example:load` | _Example_ | Illustrative load profile (ramping-vus, 5 VUs, ~2 min). |
| `npm run example:capacity` | _Example_ | Illustrative capacity profile (ramping-arrival-rate, find-the-ceiling, ~3 min). |

All three profiles write recruiter-readable artifacts to `reports/<profile>-<scenario>.md` + `reports/<profile>-<scenario>.json` (gitignored).

## Architecture First

```text
easyk6/
├── k6/
│   ├── scenarios/                    # Reusable k6 flows that later simulations will compose
│   └── simulations/
│       └── smoke/
│           └── smoke-shell.test.ts  # Stable build entry for the first smoke shell
├── lib/
│   ├── pages/                       # Generated k6-compatible page objects
│   └── pages-k6-patches/            # Persistent k6-only overrides
├── src/
│   └── pages/                       # Upstream Playwright page objects
├── scripts/                         # Build, validation, sync, and runner helpers
├── legacy-js/                       # Archived starter reference
│   ├── config/
│   ├── examples/
│   ├── pages/
│   ├── tests/
│   └── utils/
├── package.json
├── tsconfig.json
├── vite.config.ts
└── PROJECT_STRUCTURE.md
```

Boundary labels:
- `src/pages = synced upstream Playwright source`
- `lib/pages = generated k6-compatible output`
- `lib/pages-k6-patches = persistent k6-only overrides`
- `legacy-js = archived starter reference`
- `src/pages/.sync-meta.json = upstream provenance written by npm run sync:src`

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

## Upstream Reuse

The repo treats `easyPlaywright` as the permanent upstream Page Object source. The flow is linear:

1. `npm run sync:src` — copy `easyPlaywright/src/pages/` into `easyk6/src/pages/` (idempotent; wipes the local folder before copy)
2. `npm run convert-pages` — produce k6-safe modules under `lib/pages/` (lands in the next Phase 2 plan)
3. `lib/pages-k6-patches/` — k6-only methods that survive every re-sync/re-convert cycle (lands in the next Phase 2 plan)

Run sync against a sibling clone (default), an arbitrary path (`--source ./fork`), or a remote (`--repo https://github.com/Othrondir/easyPlaywright.git --branch main`). Pass `--yes` or set `CI=1` to skip the confirmation prompt before the wipe.

Current command status:
- `npm run build` bundles `k6/simulations/**/*.test.ts` into `dist/tests/...`
- `npm run validate:build` confirms the smoke-shell artifact plus its runtime-config contract files exist
- `npm run smoke` defaults to explicit demo mode against the built-in QAbbalah URL
- `npm run perf` exposes the shared runtime-config CLI grammar for real-target overrides
- `npm run sync:src` mirrors upstream `easyPlaywright/src/pages/` into local `src/pages/` (defaults to the sibling repo at `../easyPlaywright`; pass `--source <path>` or `--repo <url>` to override)
- After every sync, `src/pages/.sync-meta.json` records the source, mode, and timestamp so the upstream provenance is visible at a glance
- `npm run convert-pages` stays reserved for the next Phase 2 plan, which generates `lib/pages/` from synced sources

## Runtime Config

Root config stays intentionally small in Phase 1:

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

## Legacy Note

The original JavaScript starter remains available under `legacy-js/` for reference and comparison. It is no longer the primary architecture story for this repository.

## Next Reference

See [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) for the folder-by-folder breakdown of the new layout.
