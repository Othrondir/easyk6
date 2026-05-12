# Phase 3: Smoke Scenarios & Supported Execution - Pattern Map

**Mapped:** 2026-05-11
**Files analyzed:** 21 (5 new TS, 1 new test, 4 script/config modifies, 7 existing test modifies, 4 POMs read for shape)
**Analogs found:** 21 / 21

This map honors the D-68 plan split:
- **Plan 03-01** owns the foundation: registry skeleton, simulation entrypoint, `lib/pages/BasePage.ts` passthrough, runtime-config + perf-runner + Vite + validate-build plumbing, converter hygiene (BasePage strip rule + `.gitkeep` skip), and the registry-shape unit test.
- **Plan 03-02** owns the scenario authoring (`home-smoke.ts`, `blog-post-smoke.ts`), end-to-end smoke evidence against QAbbalah, and the Phase 1 shell cleanup.

The "Pattern Assignments" section gives every executor a concrete file path + line range to mirror. No abstract guidance.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality | Plan |
|-------------------|------|-----------|----------------|---------------|------|
| **NEW** `lib/scenarios/index.ts` | registry / barrel | static lookup map | `lib/pages/components/index.ts` | role-match (barrel) | 03-01 (skeleton) / 03-02 (real entries) |
| **NEW** `lib/simulations/smoke.ts` | k6 entrypoint (default export + `options`) | request-response (k6 browser) | `k6/simulations/smoke/smoke-shell.test.ts` | exact (Phase 1 shell) | 03-01 |
| **NEW** `lib/scenarios/home-smoke.ts` | scenario function | request-response (browser flow) | `lib/pages-k6-patches/HomePage.k6-patch.ts` body + `lib/pages/HomePage.ts:55-58` `navigate()` body | role-match (consumer of K6Page) | 03-02 |
| **NEW** `lib/scenarios/blog-post-smoke.ts` | scenario function | request-response (multi-POM flow) | `lib/pages/HomePage.ts:121-123` `navigateToPost` + `lib/pages/PostPage.ts:54-57` `navigateToPost` | role-match | 03-02 |
| **NEW** `lib/pages/BasePage.ts` | re-export shim | passthrough | `lib/pages/components/index.ts` (barrel re-export style) | role-match | 03-01 |
| `lib/config/runtime-config.ts` | config / pure module | request-response | self (lines 4-5, 66-72, 89-113) — internal edit | exact (self-edit) | 03-01 |
| `scripts/perf-runner.mjs` | Node CLI runner | request-response (spawn k6) | self (lines 73-110) — internal edit; `K6_SCENARIO` env precedent at line 68 | exact (self-edit) | 03-01 |
| `scripts/validate-build.mjs` | build-artifact check | file-I/O | self (lines 3-8) — additive | exact (self-edit) | 03-01 (add) / 03-02 (cleanup) |
| `vite.config.ts` | build config | transform (glob → entries) | self (lines 9-26) — replicate the glob pattern | exact (self-edit, additive) | 03-01 |
| `scripts/lib/transforms.mjs` | string transform | transform | self — `stripPlaywrightImports` at lines 77-85 (single-line `import { X } from '@playwright/test'` filter) | exact (same role + same flow) | 03-01 |
| `scripts/convert-pages.mjs` | converter orchestrator | file-I/O + transform pipeline | self — pipeline at lines 111-118 + `emptyLibPagesExceptBase` at lines 94-104 | exact (self-edit) | 03-01 |
| `scripts/sync-src.mjs` | sync orchestrator | file-I/O | self — `emptyDir` at lines 100-111 | exact (self-edit) | 03-01 |
| **NEW** `tests/unit/scenarios-registry.test.mjs` | unit test (TS-loader) | static introspection | `tests/unit/runtime-config.test.mjs:20-32` (`loadTypeScriptModule` helper + base64 data-URL pattern) | exact (same loader pattern, no imports) | 03-01 |
| `tests/unit/runtime-config.test.mjs` | unit test | static assertion | self — line 65 (`entryFile` assertion) | exact (self-edit) | 03-01 |
| `tests/unit/perf-runner.test.mjs` | unit test (spawn) | spawn-and-assert | self — line 38 (entry-path regex) | exact (self-edit) | 03-01 |
| `tests/unit/convert-transforms.test.mjs` | unit test (pure) | string-in / string-out | self — `R1` test at lines 18-24 + `R2` at lines 26-32 | exact (same transform-rule pattern) | 03-01 |
| `tests/unit/convert-pages.test.mjs` | integration-style unit | spawn + tempdir | self — `preserves lib/pages/base/ during wipe` at lines 168-207 | exact (mirror the sentinel-survives pattern) | 03-01 |
| `tests/unit/sync-src.test.mjs` | integration-style unit | spawn + tempdir | self — `local mode copies upstream` test at lines 50-74 (template); `makeProjectRoot` writes `.gitkeep` at line 40 | exact (template already creates `.gitkeep`) | 03-01 |
| `tests/integration/upst-03-roundtrip.test.mjs` | integration (round-trip) | spawn + diff | self — assertion at lines 119-138 + 160-180 (byte-equality of two convert runs) | exact (re-record if needed) | 03-01 |
| `k6/simulations/smoke/smoke-shell.test.ts` | DELETE (in 03-02) | n/a | self | n/a | 03-02 |
| `scripts/validate-build.mjs` (cleanup) | build-artifact check | file-I/O | self (line 4) — drop the shell entry | exact (self-edit) | 03-02 |

---

## Pattern Assignments

### Plan 03-01 — Foundation

#### `lib/scenarios/index.ts` (registry / barrel)

**Closest analog:** `lib/pages/components/index.ts` (barrel re-export style for showing "registry of named units").

**Re-export shape to mirror** (`lib/pages/components/index.ts:14-18`):
```ts
export { NavigationComponent } from './NavigationComponent';
export { ProfileComponent } from './ProfileComponent';
export { BlogPostComponent } from './BlogPostComponent';
export { FooterComponent } from './FooterComponent';
export type { BlogPostData } from './BlogPostComponent';
```

**Departure (this file is a registry, not a barrel):**
- Replace `export { X } from './X'` lines with an internal `import` and a single `export const SCENARIO_REGISTRY: Record<string, Scenario> = { ... }`.
- Also export the `Scenario` / `ScenarioFn` / `ScenarioContext` types inline (D-CC discretion — keep in `index.ts` until a second consumer appears, per Research §4 row 2).

**Concrete shape from RESEARCH §5.1 + §5.2 (already worked out — copy into the executor's hands as-is):**
```ts
import type { Page } from 'k6/browser';
import type { K6PlaywrightSelectors } from '@pages/base/selectors';

export interface ScenarioContext {
  page: Page;
  selectors: K6PlaywrightSelectors;
}
export type ScenarioFn = (ctx: ScenarioContext) => Promise<void>;
export interface Scenario {
  fn: ScenarioFn;
  description: string;
  pages: readonly string[];
}
```

In Plan 03-01, populate the registry with placeholder fn entries (a no-op async function). Plan 03-02 swaps them for real imports from `./home-smoke` and `./blog-post-smoke`.

---

#### `lib/simulations/smoke.ts` (k6 entrypoint)

**Closest analog:** `k6/simulations/smoke/smoke-shell.test.ts` (Phase 1 shell — exact same role, same data flow, same k6 module surface).

**`options` shape to copy verbatim** (`k6/simulations/smoke/smoke-shell.test.ts:7-18`):
```ts
import { browser } from 'k6/browser';

import { resolveRuntimeConfig } from '@config';

declare const __ENV: Record<string, string | undefined>;

export const options = {
  scenarios: {
    smoke: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 1,
      options: {
        browser: { type: 'chromium' },
      },
    },
  },
};
```

**Default-function body shape to adapt** (`k6/simulations/smoke/smoke-shell.test.ts:20-41`):
```ts
export default async function smokeShell(): Promise<void> {
  const runtimeConfig = resolveRuntimeConfig(
    {
      profile: __ENV.K6_PROFILE,
      scenario: __ENV.K6_SCENARIO,
      baseUrl: __ENV.BASE_URL,
      demo: __ENV.K6_DEMO === 'true',
    },
    __ENV
  );
  const page = await browser.newPage();

  console.log(
    `[easyk6] smoke profile=${runtimeConfig.profile} baseUrl=${runtimeConfig.baseUrl}`
  );

  try {
    await page.goto(runtimeConfig.baseUrl);
  } finally {
    await page.close();
  }
}
```

**Departures from the Phase 1 shell** (locked by RESEARCH §5.4 + Assumption A7 / Q3 landmine):
1. Add `thresholds` block to `options` (D-66). Three keys: `browser_web_vital_lcp: ['p(95)<3000']`, `http_req_failed: ['rate<0.01']`, `iteration_duration: ['p(95)<15000']`.
2. After `browser.newPage()`, construct `const selectors = new K6PlaywrightSelectors(page);` (imported from `@pages/base/selectors`).
3. After `page.goto(runtimeConfig.baseUrl)` (the explicit goto stays — this is the Q3 landmine fix; `HomePage.pageUrl = ''` so the scenario won't navigate without this), read `__ENV.SCENARIO ?? 'home-smoke'`, look up `SCENARIO_REGISTRY[id]`, throw `Unknown scenario '<id>'. Available: ...` on miss (D-55), and `await entry.fn({ page, selectors })`.
4. Banner comment: hand-authored — do NOT emit the "// K6-compatible version - Auto-generated" banner (the converter banner at `lib/pages/HomePage.ts:1-3` is for converted POMs only).

---

#### `lib/scenarios/home-smoke.ts` (Plan 03-02)

**Closest analogs:**
- `lib/pages-k6-patches/HomePage.k6-patch.ts:11-16` — the `measureNavigation()` body proves the `await this.navigate(); await this.waitForHomePageContent()` shape is k6-runnable.
- `lib/pages/HomePage.ts:55-58` (`navigate()`) and `lib/pages/HomePage.ts:99-101` (`getMainContentLocator()`) — locator + nav surface the scenario consumes.

**Body pattern to mirror** — combine the patch body (`HomePage.k6-patch.ts:11-16`) with visibility-assertion lines analogous to `lib/pages/HomePage.ts:63-65` (`waitForHomePageContent` uses `this.mainContent.waitFor({ state: 'visible', timeout: 15000 })`):
```ts
// lib/pages-k6-patches/HomePage.k6-patch.ts:11-16 — measureNavigation body
async measureNavigation(): Promise<number> {
  const start = Date.now();
  await this.navigate();
  await this.waitForHomePageContent();
  return Date.now() - start;
}
```

```ts
// lib/pages/HomePage.ts:63-65 — visibility-wait pattern (timeout 15000 is the established value)
async waitForHomePageContent(): Promise<void> {
  await this.mainContent.waitFor({ state: 'visible', timeout: 15000 });
}
```

**Departure for the scenario:**
1. Import the `ScenarioFn` type from `./index` (or `../scenarios` per the chosen module layout).
2. Construct `const home = new HomePage(page);` inside the fn body. POM instantiation pattern matches `lib/pages/HomePage.ts:37-44` constructor body in spirit (one new + one super).
3. Call `await home.measureNavigation()` (exercises the patch end-to-end — the recruiter-narrative invariant of D-53).
4. Three visibility assertions via locators already exposed by `HomePage`: `home.getMainContentLocator().waitFor({ state: 'visible', timeout: 10000 })`, `home.navigation.isVisible()` (NavigationComponent at `lib/pages/components/NavigationComponent.ts:48-50`), `home.blogPosts.getPostCount()` or a `getPostsContainerLocator()` wait. Use `await` consistently.
5. Single `sleep(1)` import from `'k6'` (D-58, no `SCENARIO_MODE`). The `sleep` import does not exist anywhere in `lib/` today — add it cleanly in this new file.

---

#### `lib/scenarios/blog-post-smoke.ts` (Plan 03-02)

**Closest analogs:**
- `lib/pages/HomePage.ts:121-123` (`navigateToPost(title)` → `blogPosts.clickPostByTitle(title)`) — the "home → click post" surface.
- `lib/pages/PostPage.ts:54-57` (`navigateToPost(slug)` → `page.goto('/posts/<slug>/'); waitForPostContent()`) — the "direct PostPage nav" surface.
- `lib/pages/PostPage.ts:147-163` — `getPostTitleLocator()`, `getPostContentLocator()`, `getPostBodyLocator()` are the visibility-target locators.

**Pattern from `lib/pages/PostPage.ts:54-57`:**
```ts
async navigateToPost(slug: string): Promise<void> {
  await this.page.goto(`/posts/${slug}/`);
  await this.waitForPostContent();
}
```

**Pattern from `lib/pages/PostPage.ts:62-64` (visibility wait):**
```ts
async waitForPostContent(): Promise<void> {
  await this.postContent.waitFor({ state: 'visible', timeout: 15000 });
}
```

**Scenario body shape** (RESEARCH §5.3 sketch — instantiated against the real POM surface in this repo):
1. `const home = new HomePage(page); const post = new PostPage(page);`
2. `await home.navigate();` then `await home.getMainContentLocator().waitFor({ state: 'visible', timeout: 10000 });` then `sleep(1)`.
3. `await home.blogPosts.clickPostByIndex(0);` — uses `BlogPostComponent.clickPostByIndex` which is in the converted POM. (Verify in `lib/pages/components/BlogPostComponent.ts` during 03-02 implementation; method name appears in RESEARCH §5.3 and matches the upstream surface.)
4. `await post.getPostTitleLocator().waitFor({ state: 'visible', timeout: 10000 });` + `await post.getPostBodyLocator().waitFor({ state: 'visible', timeout: 10000 });`
5. `sleep(1)`.

---

#### `lib/pages/BasePage.ts` (re-export shim)

**Closest analog:** `lib/pages/components/index.ts:14-15` — single-line re-export pattern.

**Re-export pattern from `lib/pages/components/index.ts:14`:**
```ts
export { NavigationComponent } from './NavigationComponent';
```

**Adapted shape (RESEARCH §3.2(b)):**
```ts
/**
 * BasePage — re-export shim. See RESEARCH §3.2(b) for rationale.
 * Defends against converter strip-rule regressions and future upstream POMs
 * that import BasePage in unusual ways.
 */
export { K6Page as BasePage } from './base/base-page';
```

This is hand-authored — like `lib/pages/base/base-page.ts` and `lib/pages/base/selectors.ts`, it MUST survive `convert-pages.mjs:emptyLibPagesExceptBase`. The skip-list update lives in the `scripts/convert-pages.mjs` section below.

---

#### `lib/config/runtime-config.ts` (self-edit)

**Existing lines to modify:**

Lines 4-5 — constants (D-53, D-62):
```ts
export const DEFAULT_SCENARIO = 'smoke-shell';                              // → 'home-smoke'
export const PHASE_ONE_SMOKE_ENTRY_FILE = 'dist/tests/smoke/smoke-shell.test.js';  // → SMOKE_ENTRY_FILE = 'dist/simulations/smoke.js'
```

Lines 66-72 — resolver (D-62 rewires from scenario → profile):
```ts
function resolveEntryFile(scenario: string): string {
  if (scenario === 'smoke' || scenario === DEFAULT_SCENARIO) {
    return PHASE_ONE_SMOKE_ENTRY_FILE;
  }
  return `dist/tests/${scenario}.test.js`;
}
```
Rewrite to `resolveEntryFile(profile: string): string { return \`dist/simulations/${profile}.js\`; }`. The default profile is `'smoke'` (line 3), so `'smoke'` → `'dist/simulations/smoke.js'`.

Line 112 — call site:
```ts
entryFile: resolveEntryFile(scenario),   // → resolveEntryFile(profile)
```

No other changes — `RUNTIME_FLAG_DEFINITIONS` (lines 7-36), `RuntimeCliOptions` (lines 38-46), `RuntimeConfig` (lines 48-57), `normalizeBaseUrl` (lines 74-80), and the rest of `resolveRuntimeConfig` (lines 85-114) stay byte-identical.

---

#### `scripts/perf-runner.mjs` (self-edit)

**Precedent (already in this file):** Line 68 injects `K6_SCENARIO: runtimeConfig.scenario` into the spawn env via `toRunnerEnv`. The Plan 03-01 change adds a SECOND surface: `-e SCENARIO=<id>` on the k6 argv so the script also reads it via `__ENV.SCENARIO` (D-61). Keep `K6_SCENARIO` — `runtime-config.ts:DEFAULT_SCENARIO` consumes it on the k6 side and removing it would break the smoke-shell during the transition.

**Spawn argv to modify** (`scripts/perf-runner.mjs:88`):
```ts
const child = spawn('k6', ['run', runtimeConfig.entryFile], {
  cwd: projectRoot,
  env: toRunnerEnv(runtimeConfig, mergedEnv),
  stdio: 'inherit',
});
```
Replace `['run', runtimeConfig.entryFile]` with `['run', '-e', `SCENARIO=${runtimeConfig.scenario}`, runtimeConfig.entryFile]`.

**Dry-run formatter to update** (`scripts/perf-runner.mjs:73-76`):
```ts
function printDryRun(runtimeConfig) {
  console.log(`Resolved base URL: ${runtimeConfig.baseUrl}`);
  console.log(`k6 run ${runtimeConfig.entryFile}`);
}
```
Add the `-e SCENARIO=...` segment to the second log line so dry-runs are faithful. RESEARCH Q5 calls this out — the new perf-runner test (see below) asserts the dry-run output contains `-e SCENARIO=...`.

---

#### `scripts/validate-build.mjs` (self-edit)

**Existing `requiredFiles`** (`scripts/validate-build.mjs:3-8`):
```ts
const requiredFiles = [
  'dist/tests/smoke/smoke-shell.test.js',
  'scripts/perf-runner.mjs',
  '.env.example',
  'lib/config/runtime-config.ts',
];
```

**Plan 03-01 change:** ADD `'dist/simulations/smoke.js'`. Keep the shell entry — both must exist during the transition wave. **Plan 03-02 cleanup:** remove `'dist/tests/smoke/smoke-shell.test.js'` AFTER the smoke run is confirmed green and the shell file is deleted.

---

#### `vite.config.ts` (self-edit, additive)

**Existing glob pattern to clone** (`vite.config.ts:9-26`):
```ts
const testFiles = globSync('./k6/simulations/**/*.test.ts');

const entries = testFiles.reduce(
  (acc, file) => {
    const normalizedFile = file.replaceAll('\\', '/');
    const match = normalizedFile.match(/^\.?\/?k6\/simulations\/(.+)\.ts$/);

    if (match) {
      acc[`tests/${match[1]}`] = resolve(
        projectRoot,
        normalizedFile.replace(/^\.\//, '')
      );
    }

    return acc;
  },
  {} as Record<string, string>
);
```

**Plan 03-01 change:** Add a SECOND `globSync('./lib/simulations/**/*.ts')` and merge into `entries` with the key shape `simulations/<name>` (so output is `dist/simulations/<name>.js`). The match regex becomes `/^\.?\/?lib\/simulations\/(.+)\.ts$/` and the entry key is `\`simulations/${match[1]}\``. RESEARCH Q2 notes: if a future `.test.ts` accidentally lands under `lib/simulations/`, it will be bundled — acceptable for v1; document with a comment.

**Aliases** (`vite.config.ts:60-68`) stay as-is — `@lib` already covers `@lib/scenarios` and `@lib/simulations`. `@pages` already covers POM imports from scenarios. No new alias needed.

---

#### `scripts/lib/transforms.mjs` (add `stripLocalBasePageImports`)

**Closest analog inside this file:** `stripPlaywrightImports` at lines 77-85 — same role (filter out a `from '<source>'` import line), same data flow (string in / string out).

**Pattern to clone** (`scripts/lib/transforms.mjs:77-85`):
```js
export function stripPlaywrightImports(content) {
  return content
    .split(/\r?\n/)
    .filter(
      (line) =>
        !/^\s*import\s.*from\s+['"]@playwright\/test['"];?\s*$/.test(line)
    )
    .join('\n');
}
```

**Adapted pattern** (RESEARCH §3.2(a)):
```js
export function stripLocalBasePageImports(content) {
  return content
    .split(/\r?\n/)
    .filter((line) =>
      !/^\s*import\s+\{\s*BasePage\s*\}\s+from\s+['"]\.\/?BasePage['"];?\s*$/.test(line)
    )
    .join('\n');
}
```

The regex is intentionally tight: `./BasePage` and `.BasePage` (no leading slash) but NOT `'./base/BasePage'` (which would be a different module). Matches the same single-line discipline as `stripPlaywrightImports`. Multi-line imports are out of scope — covered by the passthrough shim in `lib/pages/BasePage.ts` (RESEARCH §3.2 belt-and-suspenders).

---

#### `scripts/convert-pages.mjs` (self-edit, two changes)

**Change 1 — pipeline wiring (RESEARCH §3.2(a)):**

Imports list (`scripts/convert-pages.mjs:20-32`) — add `stripLocalBasePageImports`:
```js
import {
  stripPlaywrightImports,
  stripDuplicateK6Imports,
  injectK6Imports,
  ensureExtendsK6Page,
  ensureSuperPageCall,
  ...
} from './lib/transforms.mjs';
```

Pipeline (`scripts/convert-pages.mjs:111-118`):
```ts
content = stripPlaywrightImports(content);
content = stripDuplicateK6Imports(content);
content = ensureExtendsK6Page(content);
content = ensureSuperPageCall(content);
content = transformExpectAssertions(content);
content = transformLocatorShortcuts(content);
content = transformGetByMethods(content);
content = stripPageFieldShadow(content);
```
Insert `content = stripLocalBasePageImports(content);` AFTER `stripDuplicateK6Imports` and BEFORE `ensureExtendsK6Page` — placement matches RESEARCH §3.2(a) (after duplicate-import strip so any `{ BasePage }` line from a previous run is gone first; before extends-rewrite so the converter can detect `extends BasePage`).

**Change 2 — skip lists (RESEARCH §3.2(b) + §3.3):**

`emptyLibPagesExceptBase` at lines 94-104:
```ts
async function emptyLibPagesExceptBase() {
  await fs.mkdir(TARGET_DIR, { recursive: true });
  const entries = await fs.readdir(TARGET_DIR, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === 'base') continue;
    await fs.rm(path.join(TARGET_DIR, e.name), {
      recursive: true,
      force: true,
    });
  }
}
```
Change the `if` to skip `'base'`, `'BasePage.ts'`, AND `'.gitkeep'`:
```ts
if (e.name === 'base' || e.name === 'BasePage.ts' || e.name === '.gitkeep') continue;
```

`SKIP_FILES` set at line 55 — leave as-is (`['BasePage.ts', 'index.ts']`) because that controls source-side `src/pages/` filtering during conversion, not the lib-side wipe.

---

#### `scripts/sync-src.mjs` (self-edit, `.gitkeep` skip)

**Existing `emptyDir`** (`scripts/sync-src.mjs:100-111`):
```ts
async function emptyDir(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const tasks = entries.map(async (e) =>
      fs.rm(path.join(dir, e.name), { recursive: true, force: true })
    );
    await Promise.all(tasks);
  } catch (e) {
    if (e && e.code === 'ENOENT') return; // nothing to empty
    throw e;
  }
}
```

**Plan 03-01 change:** Filter out `'.gitkeep'` BEFORE the `.map`:
```ts
const entries = await fs.readdir(dir, { withFileTypes: true });
const tasks = entries
  .filter((e) => e.name !== '.gitkeep')
  .map(async (e) =>
    fs.rm(path.join(dir, e.name), { recursive: true, force: true })
  );
```

RESEARCH §3.3 documents this as a 4-line fix across both scripts. Keep the change minimal — do not refactor `emptyDir` further.

---

#### `tests/unit/scenarios-registry.test.mjs` (NEW)

**Closest analog:** `tests/unit/runtime-config.test.mjs` — same loader pattern, same `node --test` framework, same TS-source-to-data-URL technique.

**`loadTypeScriptModule` helper to clone verbatim** (`tests/unit/runtime-config.test.mjs:20-32`):
```js
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

**Adaptation needed:** `lib/scenarios/index.ts` imports `@pages/base/selectors` (for the type) and (after Plan 03-02) imports from `./home-smoke` / `./blog-post-smoke`. The data-URL loader does NOT resolve `@pages/*` aliases. RESEARCH §5.5 + Assumption A6 lock the mitigation: **assert metadata only** (`Object.keys`, `entry.description`, `entry.pages`). Do NOT invoke `entry.fn`. If a transient import-resolution failure surfaces during transpile, fall back to the multi-source data-URL stitching pattern used by `tests/unit/k6page-base.test.mjs:23-58` (transpile selectors first, embed as a data URL, rewrite the `from './selectors'` literal in the second transpile).

**Test shape** (RESEARCH §5.5 — three test cases):
```js
test('registry exposes home-smoke and blog-post-smoke', () => { ... });
test('every registry entry has fn, description, pages', () => { ... });
test('unknown scenario lookup returns undefined', () => { ... });
```

Plan 03-01 ships the test against the PLACEHOLDER registry (registry has `home-smoke` only OR both keys with no-op `fn` bodies). Plan 03-02 tightens the assertions (both keys present, descriptions non-empty, `pages` arrays match what the fn imports).

---

#### `tests/unit/runtime-config.test.mjs` (self-edit, 1 assertion)

**Existing assertion** (`tests/unit/runtime-config.test.mjs:65`):
```js
assert.equal(config.entryFile, PHASE_ONE_SMOKE_ENTRY_FILE);
```

**Plan 03-01 change:** After the rename in `runtime-config.ts` (D-62), update the import (line 16) from `PHASE_ONE_SMOKE_ENTRY_FILE` to `SMOKE_ENTRY_FILE` and keep the assertion structure. Asserted value becomes `'dist/simulations/smoke.js'`. The other 4 tests in this file (lines 68-120) are unaffected.

---

#### `tests/unit/perf-runner.test.mjs` (self-edit, 1 regex + 1 new assertion)

**Existing regex** (`tests/unit/perf-runner.test.mjs:38`):
```js
assert.match(result.stdout, /k6 run dist\/tests\/smoke\/smoke-shell\.test\.js/u);
```

**Plan 03-01 change:** Replace with `/k6 run.*-e SCENARIO=smoke-shell.*dist\/simulations\/smoke\.js/u` (or simpler — split into two `.match` calls for the entry path and the `-e SCENARIO=` flag). RESEARCH Q5 specifies: assert the dry-run printed command contains `-e SCENARIO=<id>` so D-61 has end-to-end coverage.

Note: in Plan 03-01 the default scenario constant becomes `'home-smoke'` (D-53), so the unit test value should match — coordinate with the `runtime-config.test.mjs` update. Alternatively, the test passes `--scenario` explicitly: e.g., `runRunner(['--profile', 'smoke', '--scenario', 'home-smoke', '--dry-run'], env)` and asserts `-e SCENARIO=home-smoke`.

Spawn pattern (`tests/unit/perf-runner.test.mjs:16-24`) — leave untouched.

---

#### `tests/unit/convert-transforms.test.mjs` (self-edit, 2 new tests)

**Closest analog inside this file:** `R1: stripPlaywrightImports` at lines 18-24 — same exact assertion shape for "strip a specific single-line import."

**Pattern to clone** (`tests/unit/convert-transforms.test.mjs:18-24`):
```js
test('R1: stripPlaywrightImports removes @playwright/test import lines', () => {
  const input =
    "import { Page, Locator, expect } from '@playwright/test';\nclass Foo {}";
  const out = stripPlaywrightImports(input);
  assert.doesNotMatch(out, /@playwright\/test/);
  assert.match(out, /class Foo \{\}/);
});
```

**Two new tests required (RESEARCH §3.2(a)):**
1. Positive: `import { BasePage } from './BasePage';\nclass X {}` → stripped, `class X {}` survives.
2. Negative: `import { Something } from './BasePage';\nimport { BasePage } from '@other/BasePage';\nclass X {}` → NEITHER line is stripped (the regex is intentionally anchored to `{ BasePage }` import and `./BasePage` / `.BasePage` specifier — anything else is a no-op).

Add the `stripLocalBasePageImports` symbol to the import list at lines 4-16. Stay below the test-naming convention used elsewhere in the file (`Rxx: <description>`); call these `R6a` and `R6b` (R6 is reserved for BasePage skip behavior in `convert-pages.mjs`, so a suffix avoids collision).

---

#### `tests/unit/convert-pages.test.mjs` (self-edit, 1 update + 2 new tests)

**Update** — `preserves lib/pages/base/ during wipe` test at lines 168-207. After RESEARCH §3.2(b), the `BasePage.ts` shim also survives the wipe. Either extend this test with an additional sentinel at `lib/pages/BasePage.ts` or add a new sibling test. The hand-authored shim file path: `path.join(tmp, 'lib', 'pages', 'BasePage.ts')`.

**Pattern to clone** (`tests/unit/convert-pages.test.mjs:168-207`):
```js
test('preserves lib/pages/base/ during wipe', async () => {
  const tmp = await makeTempProject();
  try {
    const sentinelPath = path.join(tmp, 'lib', 'pages', 'base', 'sentinel.ts');
    await writeFile(sentinelPath, '// preserved by convert-pages\n', 'utf8');
    // ... cp fixtures ...
    const result = runConvert(tmp);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const sentinelStill = await exists(sentinelPath);
    assert.equal(sentinelStill, true, '...');
  } finally {
    await rm(tmp, { force: true, recursive: true });
  }
});
```

**Two new assertions required:**
1. Author a fake `lib/pages/BasePage.ts` in the tempdir BEFORE running convert; assert it survives. (Note: `makeTempProject` at lines 49-62 currently only copies `base/base-page.ts` and `base/selectors.ts`. Add `await writeFile(path.join(tmp, 'lib', 'pages', 'BasePage.ts'), 'export { K6Page as BasePage } from "./base/base-page";\n', 'utf8');` either inside the test or in a new helper.)
2. Author a `.gitkeep` at `tmp/lib/pages/.gitkeep`; assert it survives a wipe cycle. (Tests RESEARCH §3.3.)

---

#### `tests/unit/sync-src.test.mjs` (self-edit, 1 new test)

**Closest analog inside this file:** the `local mode copies upstream` test at lines 50-74 — same `makeProjectRoot` helper, same spawn pattern.

**Key precedent** — `makeProjectRoot` at line 40 ALREADY writes a `.gitkeep` before running sync:
```js
await writeFile(path.join(tmp, 'src', 'pages', '.gitkeep'), '', 'utf8');
```

This is good news — the fixture already has a `.gitkeep` in place. Add a new test that:
1. Calls `makeProjectRoot()` (`.gitkeep` lands at `tmp/src/pages/.gitkeep`).
2. Runs the real sync against `fixtureUpstream` (the established command form).
3. Asserts `await exists(path.join(tmp, 'src', 'pages', '.gitkeep'))` is `true` AFTER the sync.

The path-safety + meta-file assertion at lines 50-74 is the template — copy that test and replace the `HomePage.ts` exists check with the `.gitkeep` exists check.

---

#### `tests/integration/upst-03-roundtrip.test.mjs` (re-record fixture if needed)

**Key assertion to verify** (`tests/integration/upst-03-roundtrip.test.mjs:119-138, 160-180`):
- Lines 119-127: `firstOutput` content match `measureNavigation` (no byte-length assertion in current test — good, RESEARCH Q1 already mitigated).
- Lines 160-180 (off-screen but in same file): byte-equality between two consecutive convert runs.

**Plan 03-01 risk:** After `stripLocalBasePageImports` lands, the generated `HomePage.ts` will be SHORTER by one line (the dangling import goes away). The byte-equality test passes only if BOTH runs produce the new, shorter output — which they will, because the transform is deterministic. **No fixture update needed for this test** unless an explicit byte-length assertion is found during 03-01 execution. RESEARCH Q1 calls this out: "replace byte-equality with content-equality of two consecutive runs — already mostly the case."

If a hard-coded byte length is discovered: replace with `assert.equal(firstOutput, secondOutput);` (the actual UPST-03 invariant).

---

### Plan 03-02 — Scenarios + smoke validation + Phase 1 shell cleanup

#### `lib/scenarios/home-smoke.ts` + `lib/scenarios/blog-post-smoke.ts`

See per-file pattern assignments above. Both files mirror the same template: import → instantiate POM(s) → call POM methods → wait for locator visibility → `sleep(1)`.

#### `lib/scenarios/index.ts` (real entries)

Replace the Plan 03-01 placeholder fn entries with real imports from `./home-smoke` and `./blog-post-smoke`. Final shape matches RESEARCH §5.2:
```ts
import { homeSmokeScenario } from './home-smoke';
import { blogPostSmokeScenario } from './blog-post-smoke';

export const SCENARIO_REGISTRY: Record<string, Scenario> = {
  'home-smoke': {
    fn: homeSmokeScenario,
    description: 'Navigate to HomePage; verify masthead, navigation, and posts list visibility.',
    pages: ['HomePage'],
  },
  'blog-post-smoke': {
    fn: blogPostSmokeScenario,
    description: 'Navigate to HomePage; open a post; verify PostPage title and body visibility.',
    pages: ['HomePage', 'PostPage'],
  },
} as const;
```

#### `k6/simulations/smoke/smoke-shell.test.ts` (DELETE)

No analog — this is a cleanup. Delete the file once the smoke run against QAbbalah is confirmed green. The Vite glob (`./k6/simulations/**/*.test.ts`) returns `[]` after deletion; the entries reducer at `vite.config.ts:11-26` handles an empty array fine (no crash, just no entries from that branch).

#### `scripts/validate-build.mjs` (cleanup)

Remove `'dist/tests/smoke/smoke-shell.test.js'` from `requiredFiles` AFTER the shell file deletion.

#### Smoke validation evidence (no file analog — manual capture)

Plan 03-02 SUMMARY must contain three artifacts (per RESEARCH §6.2):
1. k6 console output showing all 3 thresholds passing.
2. Exit code 0 from `npm run smoke`.
3. `Resolved base URL: https://othrondir.github.io/QAbbalah/` line from the runner.

Optionally a second smoke run with `--scenario blog-post-smoke` to demonstrate D-61 plumbing end-to-end.

---

## Shared Patterns

### Pattern A — TypeScript-source loader for unit tests (data-URL transpile)

**Source:** `tests/unit/runtime-config.test.mjs:20-32` (single-source) and `tests/unit/k6page-base.test.mjs:23-58` (multi-source with rewritten import literal).

**Apply to:** `tests/unit/scenarios-registry.test.mjs` (NEW) — at minimum the single-source variant. If `@pages/base/selectors` import resolution fails during transpile, escalate to the multi-source pattern.

**Pattern excerpt** (single-source from `tests/unit/runtime-config.test.mjs:20-32`):
```js
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

### Pattern B — Spawn-based integration unit test (tempdir + real script)

**Source:** `tests/unit/perf-runner.test.mjs:16-24` (lightweight spawn) and `tests/unit/convert-pages.test.mjs:49-79` (tempdir + spawn + status check).

**Apply to:** Any new test that drives a `scripts/*.mjs` script end-to-end (none required in Phase 3 beyond the perf-runner `-e SCENARIO=` assertion). Reference for the new convert-pages skip-list tests.

**Pattern excerpt** (`tests/unit/perf-runner.test.mjs:16-24`):
```js
function runRunner(args, env) {
  const result = spawnSync(process.execPath, [runnerScript, ...args], {
    cwd: projectRoot,
    env,
    encoding: 'utf8',
  });
  return result;
}
```

### Pattern C — k6 `options` block (browser scenario shape)

**Source:** `k6/simulations/smoke/smoke-shell.test.ts:7-18`.

**Apply to:** `lib/simulations/smoke.ts` (NEW) and any Phase 4 `lib/simulations/<profile>.ts`.

**Pattern excerpt** — full block (same as above, repeated for cross-reference):
```ts
export const options = {
  scenarios: {
    smoke: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 1,
      options: {
        browser: { type: 'chromium' },
      },
    },
  },
};
```

Plan 03-01 adds the `thresholds` sub-block (D-66). RESEARCH §2.1 has the full annotated block.

### Pattern D — POM-method composition (consumer of K6Page)

**Source:** `lib/pages/HomePage.ts:55-58` (`navigate()` override) and `lib/pages-k6-patches/HomePage.k6-patch.ts:11-16` (`measureNavigation()`).

**Apply to:** `lib/scenarios/home-smoke.ts` and `lib/scenarios/blog-post-smoke.ts` — the consumer side. Scenarios `new` the POM, then call its async methods in sequence. The composition is intentional: scenarios don't reach past the POM surface; they call POM methods and POM-exposed locators only.

**Pattern excerpt** (`lib/pages-k6-patches/HomePage.k6-patch.ts:11-16`):
```ts
async measureNavigation(): Promise<number> {
  const start = Date.now();
  await this.navigate();
  await this.waitForHomePageContent();
  return Date.now() - start;
}
```

The scenario body uses the same sequence (`new HomePage(page); await home.measureNavigation(); await home.<locator>.waitFor(...)`) but lives OUTSIDE the POM class. POMs are consumed; not extended.

### Pattern E — Transform-rule unit test (string-in / string-out)

**Source:** `tests/unit/convert-transforms.test.mjs:18-24` (R1 `stripPlaywrightImports`).

**Apply to:** The two new `stripLocalBasePageImports` tests in `tests/unit/convert-transforms.test.mjs`. Identical test shape; just different regex and different positive/negative inputs.

---

## No Analog Found

None. Every Phase 3 file has a concrete analog in the existing codebase (most are self-edits to existing files, and the new files map cleanly onto: a barrel re-export pattern, the Phase 1 smoke shell, the POM-consumer composition pattern, and the established unit-test loader pattern).

---

## Metadata

**Analog search scope:**
- `lib/` (TypeScript runtime: pages, simulations, config, components)
- `k6/simulations/` (Phase 1 smoke shell)
- `scripts/` (Node ESM CLI scripts: sync, convert, validate, perf-runner, transforms)
- `tests/unit/` and `tests/integration/` (test patterns + TS-source loader patterns)
- `vite.config.ts` (build entry glob pattern)

**Files scanned:** 21 (full reads) + ~6 quick `Glob`/`Read` scans for surface mapping.

**Pattern extraction date:** 2026-05-11

**Planner notes:**
- Two "new" tests are actually self-edits (runtime-config.test.mjs, perf-runner.test.mjs) — keep them in 03-01.
- The `tests/unit/scenarios-registry.test.mjs` test is the ONLY new test file required by Phase 3.
- Plan 03-01 must ship with the BasePage strip rule AND the passthrough shim (RESEARCH §3.2(c) "do both"). Either alone leaves a known failure surface.
- Plan 03-01 must also fold the `.gitkeep` skip into BOTH `sync-src.mjs` AND `convert-pages.mjs` (RESEARCH §3.3) — a 4-line cumulative change across two scripts.
- The "Q3 landmine" (HomePage.pageUrl='' → no goto) is mitigated by an explicit `await page.goto(runtimeConfig.baseUrl)` in `lib/simulations/smoke.ts` BEFORE invoking `entry.fn`. This must be in the executor's hands during 03-01 — see RESEARCH §7 Q3.1.

---

## PATTERN MAPPING COMPLETE
