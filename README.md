# EasyK6

EasyK6 is a recruiter-facing k6 browser performance framework that reuses Playwright page objects as the long-term upstream model while keeping the local developer experience simple.

Phase 1 establishes the build foundation, repo boundaries, and the shared runtime-config contract behind `npm run smoke` and `npm run perf`.

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

Current command status:
- `npm run build` bundles `k6/simulations/**/*.test.ts` into `dist/tests/...`
- `npm run validate:build` confirms the smoke-shell artifact plus its runtime-config contract files exist
- `npm run smoke` defaults to explicit demo mode against the built-in QAbbalah URL
- `npm run perf` exposes the shared runtime-config CLI grammar for real-target overrides
- `npm run sync:src` and `npm run convert-pages` stay reserved for Phase 2 work

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
