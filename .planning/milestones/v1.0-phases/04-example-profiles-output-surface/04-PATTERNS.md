# Phase 4: Example Profiles & Output Surface - Pattern Map

**Mapped:** 2026-05-11
**Files analyzed:** 11 new/modified files
**Analogs found:** 9 with strong match / 11 total (2 NEW test types have no analog — skeleton recommended)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `lib/simulations/load.ts` (NEW) | simulation entry (k6) | event-driven (k6 lifecycle: default fn + handleSummary) | `lib/simulations/smoke.ts` | exact (same role + data flow; only executor/thresholds differ) |
| `lib/simulations/capacity.ts` (NEW) | simulation entry (k6) | event-driven (k6 lifecycle: default fn + handleSummary) | `lib/simulations/smoke.ts` | exact |
| `lib/simulations/smoke.ts` (MODIFY) | simulation entry (k6) | event-driven (handleSummary added) | self — minimal additive change wiring `makeHandleSummary` | self-reference |
| `lib/simulations/lib/summary.ts` (NEW) | shared helper / factory (goja-safe) | transform (data → Record<string,string>) | `lib/config/runtime-config.ts` (pure module, named exports, goja-safe string ops) | role-match (helper module pattern) |
| `lib/simulations/lib/format-md.ts` (NEW — recommended) | pure formatter | transform (data → string) | `lib/config/runtime-config.ts::normalizeBaseUrl` (pure string fn, regex only) | role-match (pure-fn carve-out) |
| `lib/simulations/lib/format-json.ts` (NEW — recommended) | pure formatter | transform (data → string) | `lib/config/runtime-config.ts::normalizeValue` (trivial pure fn) | role-match |
| `lib/config/runtime-config.ts` (MODIFY — delete `PHASE_ONE_SMOKE_ENTRY_FILE`) | config module | — | self | self-reference (delete line 12 + lines 5-10 JSDoc) |
| `package.json` (MODIFY — add `example:load`, `example:capacity` scripts) | manifest | config | self — `smoke` and `perf` scripts (lines 10-13) | self-reference |
| `scripts/validate-build.mjs` (MODIFY — extend `requiredFiles`) | build-validator | request-response | self — `requiredFiles` array (lines 3-8) | self-reference |
| `README.md` (MODIFY — add quickstart "Supported vs Example" table) | docs | — | self — `## Commands` section (lines 41-51) | self-reference (no existing table; planner adds new) |
| `tests/unit/simulations-load.test.mjs` (NEW) | unit test | request-response | `tests/unit/scenarios-registry.test.mjs::loadSmokeOptions` (lines 124-180) | exact (multi-source data-URL pattern; assert `options` literal) |
| `tests/unit/simulations-capacity.test.mjs` (NEW) | unit test | request-response | `tests/unit/scenarios-registry.test.mjs::loadSmokeOptions` (lines 124-180) | exact |
| `tests/unit/summary-format-md.test.mjs` (NEW) | unit test | request-response | `tests/unit/runtime-config.test.mjs::loadTypeScriptModule` (lines 20-32) | role-match (single-source TS loader; pure-fn assertions) |
| `tests/unit/summary-format-json.test.mjs` (NEW) | unit test | request-response | `tests/unit/runtime-config.test.mjs::loadTypeScriptModule` (lines 20-32) | role-match |
| `tests/unit/package-scripts.test.mjs` (NEW) | unit test | request-response | **NO direct analog** — skeleton recommended (resemble `runtime-config.test.mjs` shape but read `package.json` via `node:fs/promises`) | no-analog |
| `tests/unit/readme-quickstart-table.test.mjs` (NEW) | unit test | request-response | **NO direct analog** — skeleton recommended (read `README.md` as string and regex-assert table presence) | no-analog |

---

## Pattern Assignments

### `lib/simulations/load.ts` (simulation entry, event-driven)

**Analog:** `lib/simulations/smoke.ts` (Phase 3 D-63..D-67; Plan 03-02 deviation commit `7d629ba` added `exec.test.abort`)

**Imports pattern** (`lib/simulations/smoke.ts:1-8`):
```typescript
import { browser } from 'k6/browser';
import exec from 'k6/execution';

import { resolveRuntimeConfig } from '@config';
import { K6PlaywrightSelectors } from '@pages/base/selectors';
import { SCENARIO_REGISTRY } from '@lib/scenarios';

declare const __ENV: Record<string, string | undefined>;
```

**Pattern note for load.ts:** ADD `import { makeHandleSummary } from './lib/summary';` per D-16. ADD JSDoc EXAMPLE-PROFILE banner per D-14 above the imports.

**`options` literal pattern** (`lib/simulations/smoke.ts:24-40` — verbatim shape; CHANGE executor + stages + thresholds for load):
```typescript
export const options = {
  scenarios: {
    browser: {
      executor: 'shared-iterations',          // → 'ramping-vus' for load
      vus: 1,                                  // → REMOVE for load
      iterations: 1,                           // → REMOVE for load
      // → ADD for load: startVUs: 0, stages: [...], gracefulRampDown: '30s'
      options: {
        browser: { type: 'chromium' },         // KEEP verbatim
      },
    },
  },
  thresholds: {
    browser_web_vital_lcp: ['p(95)<3000'],     // → 4000 for load (D-03)
    http_req_failed: ['rate<0.01'],            // → 0.05 for load (D-03)
    iteration_duration: ['p(95)<15000'],       // → 25000 for load (D-03)
    // → ADD for load: browser_http_req_duration: ['p(95)<2000']
    //   (NOT http_req_duration — 2026-05-11 CONTEXT amendment per D-03 provenance;
    //    browser scenarios route through chromium, leaving http_req_* empty —
    //    Phase 03-02 SUMMARY Run 1 verified 0/0 samples)
  },
};
```

**Q3 landmine + dispatch pattern** (`lib/simulations/smoke.ts:57-100` — copy verbatim, change banner string):
```typescript
export default async function smokeSimulation(): Promise<void> {
  const runtimeConfig = resolveRuntimeConfig(
    {
      profile: __ENV.K6_PROFILE,
      scenario: __ENV.K6_SCENARIO,
      baseUrl: __ENV.BASE_URL,
      demo: __ENV.K6_DEMO === 'true',
    },
    __ENV
  );

  const scenarioId = __ENV.SCENARIO ?? 'home-smoke';
  const entry = SCENARIO_REGISTRY[scenarioId];

  if (!entry) {
    const available = Object.keys(SCENARIO_REGISTRY).join(', ');
    const message = `Unknown scenario '${scenarioId}'. Available: ${available}`;
    // exec.test.abort triggers non-zero exit (SCEN-03 fail-fast). Plan 03-02
    // deviation: raw `throw` alone reports exit 0 if all thresholds pass.
    exec.test.abort(message);
    throw new Error(message);
  }

  const page = await browser.newPage();
  const selectors = new K6PlaywrightSelectors(page);

  console.log(
    `[easyk6] smoke scenario=${scenarioId} profile=${runtimeConfig.profile} baseUrl=${runtimeConfig.baseUrl}`
  );
  console.log(`[easyk6] ${entry.description}`);

  try {
    // Q3 landmine fix (Plan 03-01 D-A7): HomePage.pageUrl is '' so
    // K6Page.navigate() short-circuits. Entry MUST goto baseUrl before dispatch.
    await page.goto(runtimeConfig.baseUrl);
    await entry.fn({ page, selectors });
  } finally {
    await page.close();
  }
}
```

**Pattern note for load.ts:** Replace the `[easyk6] smoke` literal with `[easyk6] load`. Rename the default-export function `loadSimulation`. The body is otherwise identical (load reuses the same registry per D-02).

**handleSummary wiring pattern** (NEW — append after default fn):
```typescript
export const handleSummary = makeHandleSummary({
  profile: 'load',
  scenarioGetter: () => __ENV.SCENARIO ?? 'home-smoke',
  baseUrlGetter: () => __ENV.BASE_URL ?? '',
});
```

---

### `lib/simulations/capacity.ts` (simulation entry, event-driven)

**Analog:** `lib/simulations/smoke.ts`

**Pattern note:** Same as load.ts above. Differences:
- Executor block: `executor: 'ramping-arrival-rate'`, `startRate: 0`, `timeUnit: '1s'`, `preAllocatedVUs: 10`, `maxVUs: 10`, `stages: [ { duration: '180s', target: 10 } ]` (D-07; no `gracefulRampDown` required for arrival-rate)
- Thresholds (D-08): `browser_web_vital_lcp: ['p(95)<4000']`, `http_req_failed: ['rate<0.05']`, `browser_http_req_duration: ['p(95)<3000']` (2026-05-11 amendment), `iteration_duration: ['p(95)<30000']`
- Console banner: `[easyk6] capacity`
- Default-export function name: `capacitySimulation`
- handleSummary: `profile: 'capacity'`
- D-14 JSDoc EXAMPLE-PROFILE banner above imports

---

### `lib/simulations/smoke.ts` (MODIFY — wire handleSummary)

**Analog:** self (additive change only)

**Modification pattern:**
1. ADD `import { makeHandleSummary } from './lib/summary';` to the import block (after line 6).
2. APPEND at the end of the file (after line 100):
   ```typescript
   export const handleSummary = makeHandleSummary({
     profile: 'smoke',
     scenarioGetter: () => __ENV.SCENARIO ?? 'home-smoke',
     baseUrlGetter: () => __ENV.BASE_URL ?? '',
   });
   ```
3. Do NOT add the D-14 EXAMPLE-PROFILE banner — smoke is the supported path.
4. Do NOT modify `options` literal (D-66 thresholds stay verbatim; smoke regression gate per D-17).

---

### `lib/simulations/lib/summary.ts` (NEW — factory, goja-safe)

**Analog:** `lib/config/runtime-config.ts` (closest pure-module pattern in the repo; named exports + goja-safe string ops)

**Imports pattern** (mirror `lib/config/runtime-config.ts` — minimal, no Node APIs):
```typescript
// Goja-safe imports only. NO node:* modules. NO new URL. NO Buffer. NO process.
import { formatMarkdown } from './format-md';
import { formatJson } from './format-json';
```

**Type-export pattern** (mirror `runtime-config.ts:45-64` — named `export type`):
```typescript
export interface ProfileMetadata {
  profile: string;
  scenarioGetter: () => string;
  baseUrlGetter: () => string;
}
```

**Factory function pattern** (mirror `runtime-config.ts:93-122::resolveRuntimeConfig` — pure, named export, closure capture):
```typescript
export function makeHandleSummary(metadata: ProfileMetadata) {
  return function handleSummary(data: unknown): Record<string, string> {
    const scenario = metadata.scenarioGetter() || 'home-smoke';
    const baseName = `reports/${metadata.profile}-${scenario}`;
    return {
      [`${baseName}.md`]: formatMarkdown(data, {
        profile: metadata.profile,
        scenario,
        baseUrl: metadata.baseUrlGetter(),
        runDateIso: new Date().toISOString(),  // Date IS available in goja (A5)
      }),
      [`${baseName}.json`]: formatJson(data),
    };
  };
}
```

**Goja-safety constraints to mirror** (from `lib/config/runtime-config.ts:77-88::normalizeBaseUrl` — the Plan 03-02 codified pattern):
```typescript
// k6 1.5 goja runtime has no global URL constructor, so validation must avoid
// `new URL(...)`. Regex-based normalizer matches scheme+host and appends `/`
// for bare-host inputs (matches the trailing-slash behavior the public CLI
// tests expect when the user supplies BASE_URL=https://example.test).
function normalizeBaseUrl(baseUrl: string): string {
  const match = /^(https?:\/\/[^/\s]+)(\/.*)?$/iu.exec(baseUrl);
  if (!match) {
    throw new Error('BASE_URL must be a valid absolute URL.');
  }
  const [, origin, pathAndRest] = match;
  return pathAndRest ? `${origin}${pathAndRest}` : `${origin}/`;
}
```

**Apply to:** Any path/URL manipulation inside `summary.ts` or its sibling formatters MUST use regex string-ops. Forward-slash POSIX paths only — `` `reports/${profile}-${scenario}.md` `` works cross-platform under k6.

---

### `lib/simulations/lib/format-md.ts` (NEW — pure markdown formatter)

**Analog:** `lib/config/runtime-config.ts::normalizeBaseUrl` (pure fn, regex string ops only, Node-unit-testable)

**Pure-function pattern** (signature mirrors `normalizeValue`/`normalizeBaseUrl`):
```typescript
export interface FormatMeta {
  profile: string;
  scenario: string;
  baseUrl: string;
  runDateIso: string;
}

// Pure function — Node-unit-testable; goja-safe.
// Uses Array.prototype.push + join (string ops only); optional chaining for
// missing metrics (Pitfall 5 defensive coding).
export function formatMarkdown(data: unknown, meta: FormatMeta): string {
  // ... implementation per RESEARCH §6 Example 4 pseudo-code ...
}
```

**Anti-patterns to forbid** (from RESEARCH Pitfalls 2-4 + Plan 03-02 commit `7d629ba`):
- NO `new URL(...)`, `URL.parse(...)`, `URL.createObjectURL(...)` — goja has no URL.
- NO `Buffer.from(...)` — goja has no Buffer.
- NO `process.cwd()`, `process.env` — goja has no process.
- NO `path.join(...)` — goja has no path module; use template literals with `/`.
- NO `fs.writeFileSync(...)` — goja has no fs; emission is via the Record<string,string> return.

---

### `lib/simulations/lib/format-json.ts` (NEW — pure JSON formatter)

**Analog:** trivial; `JSON.stringify` is goja-safe stdlib

**Pattern:**
```typescript
export function formatJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}
```

Same goja-safety constraints apply (no Node APIs).

---

### `lib/config/runtime-config.ts` (MODIFY — D-18 cleanup)

**Analog:** self

**Modification pattern:**
1. DELETE line 12: `export const PHASE_ONE_SMOKE_ENTRY_FILE = 'dist/tests/smoke/smoke-shell.test.js';`
2. DELETE lines 5-10 (the JSDoc explaining the transition alias — no longer relevant).
3. Keep `SMOKE_ENTRY_FILE` (line 11) — still consumed by `tests/unit/runtime-config.test.mjs:16-18`.

**Verified — no other consumers:** `grep -r PHASE_ONE_SMOKE_ENTRY_FILE lib tests scripts` returns the constant declaration in `runtime-config.ts:12` only. The Plan 03-02 deletion of `validate-build.mjs`'s consumer is already shipped. `tests/unit/runtime-config.test.mjs:16` imports `SMOKE_ENTRY_FILE`, not the legacy constant.

---

### `package.json` (MODIFY — add example scripts)

**Analog:** self — `scripts` block at `package.json:6-14`

**Existing pattern** (`package.json:10-13`):
```jsonc
"scripts": {
    "build": "vite build",
    "build:watch": "vite build --watch",
    "validate:build": "node scripts/validate-build.mjs",
    "perf": "node scripts/perf-runner.mjs",
    "smoke": "node scripts/perf-runner.mjs --profile smoke --demo",
    "sync:src": "node scripts/sync-src.mjs",
    "convert-pages": "node scripts/convert-pages.mjs"
}
```

**Modification pattern** (D-13 recruiter-readable ordering per RESEARCH §6 Example 6):
- ADD `"example:load": "node scripts/perf-runner.mjs --profile load --demo"` directly after `"smoke"`.
- ADD `"example:capacity": "node scripts/perf-runner.mjs --profile capacity --demo"` directly after `"example:load"`.
- Optionally reorder so `smoke` → `example:load` → `example:capacity` → `perf` lead the block (recruiter inspection top-to-bottom).
- DO NOT change `"smoke"` (Phase 1 D-06/D-07 surface contract; backward compatibility).
- DO NOT change `"perf"` (still the raw escape-hatch).

---

### `scripts/validate-build.mjs` (MODIFY — extend `requiredFiles`)

**Analog:** self — `requiredFiles` array (`scripts/validate-build.mjs:3-8`)

**Existing pattern** (post-Plan 03-02; Phase 1 shell entry already removed in commit `5879f80`):
```javascript
import { existsSync } from 'node:fs';

const requiredFiles = [
  'dist/simulations/smoke.js',
  'scripts/perf-runner.mjs',
  '.env.example',
  'lib/config/runtime-config.ts',
];

const missingFiles = requiredFiles.filter((file) => !existsSync(file));

if (missingFiles.length > 0) {
  console.error(`Missing required files: ${missingFiles.join(', ')}`);
  process.exit(1);
}

console.log(`Validated build shell: ${requiredFiles.join(', ')}`);
```

**Modification pattern** (strict list per CONTEXT D-17(f) + RESEARCH §6 Example 7):
- INSERT `'dist/simulations/load.js'` after line 4.
- INSERT `'dist/simulations/capacity.js'` after the new line.
- Final shape: `[ 'dist/simulations/smoke.js', 'dist/simulations/load.js', 'dist/simulations/capacity.js', 'scripts/perf-runner.mjs', '.env.example', 'lib/config/runtime-config.ts' ]`.
- No other changes — the existence-filter + error handling pattern is correct.

---

### `README.md` (MODIFY — add "Supported vs Example" quickstart table per D-15)

**Analog:** self — `## Commands` section (`README.md:41-51`)

**Existing pattern** (no quickstart table yet; commands rendered as bare code block):
```markdown
## Commands

\`\`\`bash
npm install
npm run build
npm run validate:build
npm run smoke
npm run perf
npm run sync:src
npm run convert-pages
\`\`\`
```

**Modification pattern** (D-15 — table lives in Quickstart, prominent, before install/build steps):
- ADD a new `## Quickstart` section directly after the project intro (after line 7, before "## Architecture First").
- The Quickstart section MUST contain the 3-row table contract per D-13:
  ```markdown
  ## Quickstart

  | Command | Status | What it does |
  | --- | --- | --- |
  | `npm run smoke` | Supported | Runs the demo smoke profile against the built-in QAbbalah target. |
  | `npm run example:load` | Example | Illustrative load profile (ramping-vus, 5 VUs, ~2 min). |
  | `npm run example:capacity` | Example | Illustrative capacity profile (ramping-arrival-rate, breaking-point ramp). |
  ```
- Phase 4 lands the table contract only (D-15 — exact columns/rows). Surrounding prose polish is Phase 5 DOCS-01/DOCS-02.
- DO NOT remove the `## Commands` bare code block — Phase 5 owns its rewrite.

---

### `tests/unit/simulations-load.test.mjs` (NEW unit test)

**Analog:** `tests/unit/scenarios-registry.test.mjs::loadSmokeOptions` (lines 124-180) — exact pattern reuse

**Multi-source data-URL stitching pattern** (`tests/unit/scenarios-registry.test.mjs:124-180`):
```javascript
// ---------- Multi-source loader for lib/simulations/smoke.ts ----------
// `smoke.ts` imports four non-relative modules. The data-URL `import()` does
// NOT resolve aliases, so we rewrite each import literal to a data-URL stub
// that exports just enough surface for the `options` literal to evaluate.
// The default function body is NEVER invoked from this test — only the
// top-level `export const options` literal is asserted.
async function loadSmokeOptions() {
  const stubs = {
    'k6/browser':
      'export const browser = { newPage: async () => null };',
    'k6/execution':
      'export default { test: { abort: () => {} } };',
    '@lib/scenarios':
      'export const SCENARIO_REGISTRY = {};',
    '@pages/base/selectors':
      'export class K6PlaywrightSelectors { constructor() {} }',
    '@config':
      'export function resolveRuntimeConfig() { return { profile: "smoke", scenario: "home-smoke", baseUrl: "https://example.test/", demo: false, envFile: ".env", showConfig: false, dryRun: false, entryFile: "dist/simulations/smoke.js" }; }',
  };

  const stubDataUrls = {};
  for (const [specifier, source] of Object.entries(stubs)) {
    const encoded = Buffer.from(source, 'utf8').toString('base64');
    stubDataUrls[specifier] = `data:text/javascript;base64,${encoded}`;
  }

  const smokePath = path.join(projectRoot, 'lib', 'simulations', 'smoke.ts');
  let smokeSrc = await readFile(smokePath, 'utf8');

  for (const [specifier, dataUrl] of Object.entries(stubDataUrls)) {
    const escaped = specifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    smokeSrc = smokeSrc.replace(
      new RegExp(`from\\s+['"]${escaped}['"]`, 'g'),
      `from '${dataUrl}'`
    );
  }

  const { outputText } = ts.transpileModule(smokeSrc, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: smokePath,
  });
  const encoded = Buffer.from(outputText, 'utf8').toString('base64');
  return import(`data:text/javascript;base64,${encoded}`);
}
```

**Pattern note for load.ts test:** Reuse the function VERBATIM. Two adjustments:
1. Path: `lib/simulations/load.ts` instead of `smoke.ts`.
2. Stubs: ADD `'./lib/summary'` stub: `'export function makeHandleSummary() { return () => ({}); }'` (because load.ts imports it; the test only asserts `options`, not handleSummary behavior).

**Assertion pattern** (`tests/unit/scenarios-registry.test.mjs:240-272`):
```javascript
test('load options: ramping-vus / 3-stage shape / chromium browser', async () => {
  const mod = await loadLoadOptions();
  const { options } = mod;
  assert.ok(options, 'options must be exported from lib/simulations/load.ts');
  const sc = options.scenarios.browser;
  assert.equal(sc.executor, 'ramping-vus');
  assert.equal(sc.startVUs, 0);
  assert.deepEqual(sc.stages, [
    { duration: '30s', target: 5 },
    { duration: '60s', target: 5 },
    { duration: '30s', target: 0 },
  ]);
  assert.equal(sc.options.browser.type, 'chromium');
});

test('load options: thresholds use D-03 verbatim (post-amendment: browser_http_req_duration)', async () => {
  const mod = await loadLoadOptions();
  const { options } = mod;
  assert.deepEqual(options.thresholds.browser_web_vital_lcp, ['p(95)<4000']);
  assert.deepEqual(options.thresholds.http_req_failed, ['rate<0.05']);
  assert.deepEqual(options.thresholds.iteration_duration, ['p(95)<25000']);
  assert.deepEqual(options.thresholds.browser_http_req_duration, ['p(95)<2000']);
});
```

---

### `tests/unit/simulations-capacity.test.mjs` (NEW unit test)

**Analog:** identical to load test above

**Pattern note:** Same loader pattern, swap `load.ts` → `capacity.ts`. Assertions per D-08:
- `sc.executor === 'ramping-arrival-rate'`, `sc.startRate === 0`, `sc.timeUnit === '1s'`, `sc.preAllocatedVUs === 10`, `sc.maxVUs === 10`
- `sc.stages` deepEqual `[ { duration: '180s', target: 10 } ]`
- Thresholds: `browser_web_vital_lcp: ['p(95)<4000']`, `http_req_failed: ['rate<0.05']`, `browser_http_req_duration: ['p(95)<3000']`, `iteration_duration: ['p(95)<30000']`

---

### `tests/unit/summary-format-md.test.mjs` (NEW unit test)

**Analog:** `tests/unit/runtime-config.test.mjs::loadTypeScriptModule` (lines 20-32) — single-source TS loader

**Pattern** (`tests/unit/runtime-config.test.mjs:20-32`):
```javascript
async function loadTypeScriptModule(fileUrl) {
  const source = await readFile(fileUrl, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: fileUrl.pathname,
  });

  const encoded = Buffer.from(outputText, 'utf8').toString('base64');
  return import(`data:text/javascript;base64,${encoded}`);
}
```

**Pattern note for format-md test:** `format-md.ts` is a pure function with NO relative imports (no `./summary`, no `@config`). The single-source loader from `runtime-config.test.mjs` suffices verbatim. Assert deterministic data-in → expected-string-out per Pitfall 5 defensive shape:
- Fixture 1: full metrics (LCP + iteration_duration + http_req_failed + browser_http_req_duration + browser_data_received all populated) → header + thresholds table + key-metrics table + footer present.
- Fixture 2: browser-scenario empty `http_req_*` (0 samples — mirror Phase 03-02 SUMMARY Run 1) → key-metrics table renders `n/a (no samples)` for that row.
- Fixture 3: missing optional metrics → no throw (defensive optional chaining).

**Assertion pattern** (mirror `runtime-config.test.mjs:59-66` — assert by content match, not by structural deep-equal):
```javascript
test('format-md: renders header with profile / scenario / baseUrl / runDateIso', () => {
  const md = formatMarkdown(fixtureFullMetrics, {
    profile: 'load',
    scenario: 'home-smoke',
    baseUrl: 'https://othrondir.github.io/QAbbalah/',
    runDateIso: '2026-05-11T12:00:00.000Z',
  });
  assert.match(md, /# load run — home-smoke/u);
  assert.match(md, /https:\/\/othrondir\.github\.io\/QAbbalah\//u);
  assert.match(md, /2026-05-11T12:00:00\.000Z/u);
});
```

---

### `tests/unit/summary-format-json.test.mjs` (NEW unit test)

**Analog:** `tests/unit/runtime-config.test.mjs::loadTypeScriptModule` (lines 20-32)

**Pattern note:** Same single-source loader. Assertions are trivial — `JSON.parse(formatJson(data))` round-trip equals `data`; output is 2-space indented (regex `/^{\n  "/`).

---

### `tests/unit/package-scripts.test.mjs` (NEW unit test — no analog)

**Closest reference:** `tests/unit/validate-build.test.mjs` does NOT exist (verified — `tests/unit/` has 10 files, none asserting `package.json`).

**Recommended skeleton** (planner authors fresh; pattern derived from `tests/unit/runtime-config.test.mjs` shape — Node `node:test` + `assert/strict` + `node:fs/promises::readFile`):
```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..'
);

async function loadPackageJson() {
  const raw = await readFile(path.join(projectRoot, 'package.json'), 'utf8');
  return JSON.parse(raw);
}

test('package.json: example:load script targets perf-runner with --profile load --demo', async () => {
  const pkg = await loadPackageJson();
  assert.equal(
    pkg.scripts['example:load'],
    'node scripts/perf-runner.mjs --profile load --demo'
  );
});

test('package.json: example:capacity script targets perf-runner with --profile capacity --demo', async () => {
  const pkg = await loadPackageJson();
  assert.equal(
    pkg.scripts['example:capacity'],
    'node scripts/perf-runner.mjs --profile capacity --demo'
  );
});

test('package.json: smoke script remains unchanged (Phase 1 D-06 backward compatibility)', async () => {
  const pkg = await loadPackageJson();
  assert.equal(
    pkg.scripts.smoke,
    'node scripts/perf-runner.mjs --profile smoke --demo'
  );
});
```

---

### `tests/unit/readme-quickstart-table.test.mjs` (NEW unit test — no analog)

**Closest reference:** no markdown-asserting test in the repo (verified via `grep -ri "markdown\|readme\|\.md" tests/unit` — 0 results).

**Recommended skeleton** (regex assertions on README content):
```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..'
);

async function loadReadme() {
  return readFile(path.join(projectRoot, 'README.md'), 'utf8');
}

test('README: Quickstart section exists before Architecture First (D-15 ordering)', async () => {
  const readme = await loadReadme();
  const quickstartIdx = readme.indexOf('## Quickstart');
  const archIdx = readme.indexOf('## Architecture First');
  assert.ok(quickstartIdx > 0, 'Quickstart section must exist');
  assert.ok(
    quickstartIdx < archIdx,
    'Quickstart must appear BEFORE Architecture First (D-15 — prominent placement)'
  );
});

test('README: Supported vs Example table has the three D-13 rows', async () => {
  const readme = await loadReadme();
  // Table contract per D-13: smoke / example:load / example:capacity
  assert.match(readme, /\|\s*`npm run smoke`\s*\|\s*Supported\s*\|/u);
  assert.match(readme, /\|\s*`npm run example:load`\s*\|\s*Example\s*\|/u);
  assert.match(readme, /\|\s*`npm run example:capacity`\s*\|\s*Example\s*\|/u);
});

test('README: table has the three-column header (Command | Status | What it does)', async () => {
  const readme = await loadReadme();
  assert.match(
    readme,
    /\|\s*Command\s*\|\s*Status\s*\|\s*What it does\s*\|/u
  );
});
```

---

## Shared Patterns

### Pattern: Goja-safe TypeScript module (Plan 03-02 codified pattern)

**Source:** `lib/config/runtime-config.ts:77-88` (`normalizeBaseUrl` — Plan 03-02 commit `7d629ba` deviation)

**Apply to:** ALL new files under `lib/simulations/lib/` (summary.ts, format-md.ts, format-json.ts). Apply to MODIFY of `lib/simulations/smoke.ts` (the new handleSummary wiring lives in goja).

**Forbidden globals/APIs** (verified empirically in Plan 03-02 SUMMARY runs):
- `new URL(...)`, `URL.parse(...)`, `URL.createObjectURL(...)` — goja has no URL constructor
- `Buffer`, `Buffer.from(...)` — goja has no Buffer
- `process`, `process.cwd()`, `process.env` — goja has no process global
- `require(...)` — k6 uses ES modules
- `path.join(...)`, any `node:*` import — goja has no Node stdlib
- `fs.writeFileSync(...)` — goja has no fs; the ONLY documented file-emission path is `handleSummary`'s `Record<string, string>` return

**Allowed and verified** (Phase 03-02 SUMMARY Run logs):
- `new Date().toISOString()` (RESEARCH A5)
- `JSON.stringify(value, replacer, indent)` (RESEARCH §"Don't Hand-Roll")
- `Object.entries`, `Object.keys`, `Array.prototype.push/join/map/filter` (ES2015+ stdlib)
- Template literals + regex
- `__ENV` reads INSIDE function bodies (NOT at module top-level — Pitfall 4)

**Codified example to mirror** (`lib/config/runtime-config.ts:81-87`):
```typescript
// k6 1.5 goja runtime has no global URL constructor, so validation must avoid
// `new URL(...)`. Regex-based normalizer matches scheme+host and appends `/`
// for bare-host inputs (matches the trailing-slash behavior the public CLI
// tests expect when the user supplies BASE_URL=https://example.test).
const match = /^(https?:\/\/[^/\s]+)(\/.*)?$/iu.exec(baseUrl);
```

---

### Pattern: Multi-source data-URL TypeScript loader for unit tests

**Source:** `tests/unit/scenarios-registry.test.mjs:124-180::loadSmokeOptions` (Plan 03-02 multi-source generalization; original Plan 03-01 pattern is also at `tests/unit/scenarios-registry.test.mjs:52-116::loadScenarioRegistry` for index.ts)

**Apply to:** Any unit test that imports a TS file containing non-relative specifiers (`k6/*`, `@config`, `@pages/*`, `@lib/*`, `./lib/summary`). Specifically: `tests/unit/simulations-load.test.mjs` + `tests/unit/simulations-capacity.test.mjs`.

**NOT needed for** files with no non-relative imports — use the single-source `loadTypeScriptModule` pattern from `tests/unit/runtime-config.test.mjs:20-32` instead. Specifically: `tests/unit/summary-format-md.test.mjs` + `tests/unit/summary-format-json.test.mjs` (the formatters are pure).

**Why goja-free assertion is necessary:** Node's `import('data:text/javascript;base64,...')` cannot resolve aliases (`@config`, `@pages/*`) or k6-runtime modules (`k6/browser`, `k6/execution`). The stub-and-rewrite pattern is the proven workaround.

**Apply scope:**
1. Identify every `from '<specifier>'` in the TS source.
2. Author a minimal stub for each non-relative specifier that exports just enough symbols for the test's assertion target (e.g., the `options` literal at module-top doesn't need real `browser.newPage`).
3. Encode each stub as a base64 data-URL.
4. Regex-replace `from '<specifier>'` with `from '<data-url>'` in the source string BEFORE `ts.transpileModule`.
5. Final `import('data:text/javascript;base64,<transpiled>')` yields the module.

---

### Pattern: Profile-keyed dist mapping (Phase 3 D-62 — collected in Phase 4)

**Source:** `lib/config/runtime-config.ts:73-75::resolveEntryFile`

```typescript
function resolveEntryFile(profile: string): string {
  return `dist/simulations/${profile}.js`;
}
```

**Apply to:** Phase 4 needs NO change to runtime-config's resolver. Adding `lib/simulations/load.ts` + `lib/simulations/capacity.ts` automatically maps `--profile load` → `dist/simulations/load.js` and `--profile capacity` → `dist/simulations/capacity.js`.

**Source:** `vite.config.ts:32-43`
```typescript
const simulationFiles = globSync('./lib/simulations/**/*.ts');

for (const file of simulationFiles) {
  const normalizedFile = file.replaceAll('\\', '/');
  const match = normalizedFile.match(/^\.?\/?lib\/simulations\/(.+)\.ts$/);
  if (match) {
    entries[`simulations/${match[1]}`] = resolve(
      projectRoot,
      normalizedFile.replace(/^\.\//, '')
    );
  }
}
```

**Apply to:** Phase 4 needs NO change to vite.config.ts. The glob `./lib/simulations/**/*.ts` picks up `load.ts`, `capacity.ts`, AND `lib/summary.ts` / `lib/format-md.ts` / `lib/format-json.ts`. BUT — the helper files under `lib/simulations/lib/` will also emit to `dist/simulations/lib/*.js`. The simulation entries import via relative `./lib/summary` paths so Rollup will inline-bundle them into the parent entry's `dist/simulations/<profile>.js` (Vite library mode with `format: 'cjs'`). The emitted `dist/simulations/lib/*.js` artifacts are harmless but the planner should verify they don't accidentally become validate-build entries.

---

### Pattern: scripts/perf-runner.mjs spawn / -e flag plumbing (Phase 3 — no change needed)

**Source:** `scripts/perf-runner.mjs:73-87::buildK6Args` + `:108-117` (spawn)

```javascript
function buildK6Args(runtimeConfig) {
  return [
    'run',
    '-e', `SCENARIO=${runtimeConfig.scenario}`,
    '-e', `BASE_URL=${runtimeConfig.baseUrl}`,
    '-e', `K6_PROFILE=${runtimeConfig.profile}`,
    '-e', `K6_SCENARIO=${runtimeConfig.scenario}`,
    '-e', `K6_DEMO=${String(runtimeConfig.demo)}`,
    runtimeConfig.entryFile,
  ];
}

// ... spawn ...
const child = spawn('k6', buildK6Args(runtimeConfig), {
  cwd: projectRoot,
  env: toRunnerEnv(runtimeConfig, mergedEnv),
  stdio: 'inherit',
});
```

**Apply to:** Phase 4 needs NO change. The runner already plumbs the 5 `-e` flags for ANY profile. `cwd: projectRoot` (line 113) is the cross-platform anchor that makes `reports/<profile>-<scenario>.md` resolve correctly from `handleSummary`'s returned key (RESEARCH §6 Example 3 path-resolution rule).

---

## No Analog Found

Files with no close match in the codebase — planner uses skeleton recommendations above + RESEARCH §6 patterns:

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `tests/unit/package-scripts.test.mjs` | unit test | request-response | No existing test asserts `package.json` contents. Skeleton above derives shape from `tests/unit/runtime-config.test.mjs` (Node `node:test` + `assert/strict` + `readFile`). |
| `tests/unit/readme-quickstart-table.test.mjs` | unit test | request-response | No existing test asserts Markdown content. Skeleton above uses regex pattern matching on the README string. |
| `lib/simulations/lib/summary.ts` (factory wrapper for `handleSummary`) | shared helper | transform | No existing factory pattern in the codebase. Closest analog is `lib/config/runtime-config.ts` (pure module, named exports). The k6 `handleSummary` contract itself is documented in RESEARCH §2 + §6 Example 3. |

---

## Cross-Cutting Patterns for the Planner

### CC-1: Wave 0 fail-fast on http_req_duration → browser_http_req_duration retarget

CONTEXT D-03/D-08 (2026-05-11 amendment) already locks `browser_http_req_duration`. The planner does NOT need to run a Wave-0 empirical retarget check (RESEARCH Open Question 1 was answered by the CONTEXT amendment). Test fixtures for `format-md.test.mjs` SHOULD include both:
- A fixture where `browser_http_req_duration` has real samples (renders the row).
- A fixture where `http_req_duration` (the k6/http metric) reads 0/empty (renders `n/a (no samples)` per D-11) — defensive coverage for any future profile that uses `k6/http` directly.

### CC-2: Smoke regression gate (D-17)

`lib/simulations/smoke.ts` MODIFY (handleSummary wiring) MUST be validated through:
1. The existing `tests/unit/scenarios-registry.test.mjs::loadSmokeOptions` test stays green (smoke's `options` literal unchanged).
2. A NEW assertion in `simulations-load.test.mjs` and/or `simulations-capacity.test.mjs` style for smoke: `assert.equal(typeof mod.handleSummary, 'function')`. This catches the wire-up regression.
3. After build, a real `npm run smoke` invocation produces `reports/smoke-home-smoke.md` + `reports/smoke-home-smoke.json` (manual smoke evidence step per Plan 03-02 Task 2 pattern).

### CC-3: `dist/simulations/lib/*.js` emit hygiene

If Vite's library-mode emit produces `dist/simulations/lib/summary.js` etc. as side-products of the glob, those files are NOT entry-script paths the runner consumes. Do NOT add them to `validate-build.mjs::requiredFiles`. Only the profile-keyed entry files (`smoke.js`, `load.js`, `capacity.js`) belong in the strict list per CONTEXT D-17(f).

The planner should empirically verify the dist tree after first build:
- Required: `dist/simulations/smoke.js`, `dist/simulations/load.js`, `dist/simulations/capacity.js` exist
- Acceptable: `dist/simulations/lib/*.js` exists OR is bundled-inline (Vite may inline `./lib/summary` into each parent entry)
- Either outcome is fine — only the three profile entries are runner-consumed.

### CC-4: Phase 4 needs NO runner / config / scenario / vite changes

Phase 3 D-62 promise being collected: profile-keyed resolver + Vite glob already handle the new entries. Plan 03-02 commit `7d629ba` already encodes the goja safety rules. Phase 4 is purely additive at the simulation entry + helper layer + manifest layer.

---

## Metadata

**Analog search scope:**
- `lib/simulations/` (smoke.ts only — load.ts/capacity.ts are NEW)
- `lib/config/runtime-config.ts` (closest pure-module pattern)
- `lib/scenarios/` (registry contract — UNCHANGED in Phase 4)
- `tests/unit/` (10 files; multi-source data-URL pattern at scenarios-registry.test.mjs)
- `scripts/` (validate-build.mjs + perf-runner.mjs)
- `package.json`, `vite.config.ts`, `tsconfig.json`, `README.md`, `.gitignore`

**Files scanned:** 15

**Pattern extraction date:** 2026-05-11

**Verified empirical references:**
- Plan 03-02 SUMMARY Run 1 (browser HTTP samples vs k6/http empty — supports the 2026-05-11 D-03/D-08 amendment)
- Plan 03-02 commit `7d629ba` (goja safety rules codified)
- Plan 03-02 commit `5879f80` (validate-build Phase 1 shell entry already removed; requiredFiles list currently at 4 entries)
