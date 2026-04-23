# EasyK6 Project Structure

This document explains the Phase 1 repository shape. The goal is to make the upstream source, generated output, and k6-specific customization points obvious before sync and conversion logic arrive.

## Primary Layout

```text
easyk6/
├── k6/
│   ├── scenarios/
│   │   └── .gitkeep
│   └── simulations/
│       └── smoke/
│           └── smoke-shell.test.ts
├── lib/
│   ├── pages/
│   │   └── .gitkeep
│   └── pages-k6-patches/
│       └── .gitkeep
├── src/
│   └── pages/
│       └── .gitkeep
├── scripts/
│   ├── perf-runner.mjs
│   ├── sync-src.mjs
│   ├── convert-pages.mjs
│   └── validate-build.mjs
├── legacy-js/
│   ├── config/
│   ├── examples/
│   ├── pages/
│   ├── tests/
│   └── utils/
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Boundary Definitions

- `src/pages = synced upstream Playwright source`
- `lib/pages = generated k6-compatible output`
- `lib/pages-k6-patches = persistent k6-only overrides`
- `k6/scenarios = reusable flows shared by future simulations`
- `k6/simulations = executable k6 entrypoints that build into dist/tests/...`
- `legacy-js = archived starter reference`

## Root Directories

### `k6/`

Holds the TypeScript-side k6 execution surface.

- `k6/simulations/` contains build entrypoints discovered by `vite.config.ts`
- `k6/scenarios/` is reserved for reusable flows once real smoke journeys are added

### `lib/`

Holds repository-owned artifacts derived for k6 execution.

- `lib/pages/` is where generated page objects will land
- `lib/pages-k6-patches/` is where durable manual k6-only overrides live

### `src/`

Holds upstream Playwright material.

- `src/pages/` is intentionally empty in Phase 1 because sync lands in Phase 2

### `scripts/`

Holds Node helpers behind the public npm command surface.

- `perf-runner.mjs` is the temporary public runner shell
- `sync-src.mjs` and `convert-pages.mjs` are explicit Phase 2 placeholders
- `validate-build.mjs` checks for the expected smoke-shell bundle

### `legacy-js/`

Preserves the old starter without letting it define the new architecture.

- `legacy-js/config/config.js` and `legacy-js/config/thresholds.js` keep the old hardcoded config
- `legacy-js/pages/BasePage.js` and related files keep the JavaScript POM example
- `legacy-js/tests/smoke/basic-smoke.test.js` preserves the original smoke example
- `legacy-js/examples/` and `legacy-js/utils/` remain available as historical reference

## Build Flow

`npm run build` uses Vite to discover `k6/simulations/**/*.test.ts` and emit CommonJS bundles under `dist/tests/...`.

`npm run validate:build` currently verifies the smoke-shell artifact at `dist/tests/smoke/smoke-shell.test.js`.

## Legacy Policy

`legacy-js/` is kept to preserve the original starter ideas and working relative imports. New implementation work should target `src/`, `lib/`, `k6/`, and `scripts/` instead.
