# EasyK6

EasyK6 is a recruiter-facing k6 browser performance framework that reuses Playwright page objects as the long-term upstream model while keeping the local developer experience simple.

Phase 1 establishes the build foundation and repo boundaries. `npm run build` is real today. `npm run smoke`, `npm run perf`, `npm run sync:src`, and `npm run convert-pages` are honest placeholders until the next plans wire in real runtime behavior.

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
- `npm run validate:build` confirms the expected smoke-shell artifact exists
- `npm run smoke` and `npm run perf` print the temporary Phase 1 placeholder message
- `npm run sync:src` and `npm run convert-pages` stay reserved for Phase 2 work

## Legacy Note

The original JavaScript starter remains available under `legacy-js/` for reference and comparison. It is no longer the primary architecture story for this repository.

## Next Reference

See [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) for the folder-by-folder breakdown of the new layout.
