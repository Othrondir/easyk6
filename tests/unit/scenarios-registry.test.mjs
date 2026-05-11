// tests/unit/scenarios-registry.test.mjs
// Wave-0 RED stage (Plan 03-01 Task 1).
//
// This test is authored BEFORE `lib/scenarios/index.ts` and
// `lib/simulations/smoke.ts` exist. Running it now MUST fail with a
// missing-module error — that confirms the test reaches the not-yet-written
// production code. Tasks 4 and 5 turn this suite green.
//
// Loader: the `loadTypeScriptModule` helper below mirrors verbatim the pattern
// from `tests/unit/runtime-config.test.mjs:20-32`. The simulation module
// (`lib/simulations/smoke.ts`) imports `k6/browser`, `@lib/scenarios`,
// `@pages/base/selectors`, and `@config`. The data-URL loader does NOT resolve
// `@*` aliases, so we rewrite those import literals to data-URL stubs BEFORE
// transpiling smoke.ts (mirrors the multi-source pattern in
// `tests/unit/k6page-base.test.mjs:23-58`).
//
// For `lib/scenarios/index.ts`, we use `import type { K6PlaywrightSelectors }`
// and `import type { Page }` — these are erased by `ts.transpileModule`, so
// the loader can read the registry module without resolving `@pages/*` or
// `k6/browser` at transpile time. That is locked in Plan 03-01 Task 4.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import ts from 'typescript';

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..'
);

// ---------- Single-source TypeScript loader ----------
// Verbatim copy from tests/unit/runtime-config.test.mjs:20-32.
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

// ---------- Multi-source loader for lib/simulations/smoke.ts ----------
// `smoke.ts` imports four non-relative modules. The data-URL `import()` does
// NOT resolve aliases, so we rewrite each import literal to a data-URL stub
// that exports just enough surface for the `options` literal to evaluate.
// The default function body is NEVER invoked from this test — only the
// top-level `export const options` literal is asserted.
async function loadSmokeOptions() {
  const stubs = {
    // k6/browser — only `browser` is used inside the default function; not
    // touched while reading `options`. Provide a no-op shape anyway.
    'k6/browser':
      'export const browser = { newPage: async () => null };',

    // @lib/scenarios — only consumed inside the default function. Provide a
    // minimal empty registry so any module-init access (none today) is safe.
    '@lib/scenarios':
      'export const SCENARIO_REGISTRY = {};',

    // @pages/base/selectors — selectors class referenced only inside the
    // default function. Provide a constructible no-op class.
    '@pages/base/selectors':
      'export class K6PlaywrightSelectors { constructor() {} }',

    // @config — resolveRuntimeConfig is only invoked inside the default
    // function. The simulation module evaluates the import at parse time;
    // export a no-op function so the import resolves but never runs.
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

  // Rewrite import literals to point at the stub data URLs.
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

const registryUrl = new URL(
  '../../lib/scenarios/index.ts',
  import.meta.url
);

// ---------- Tests ----------

test('registry: exposes home-smoke and blog-post-smoke keys', async () => {
  const mod = await loadTypeScriptModule(registryUrl);
  const { SCENARIO_REGISTRY } = mod;
  assert.ok(SCENARIO_REGISTRY, 'SCENARIO_REGISTRY must be exported');
  const keys = Object.keys(SCENARIO_REGISTRY);
  assert.ok(
    keys.includes('home-smoke'),
    `expected 'home-smoke' key, got: ${keys.join(', ')}`
  );
  assert.ok(
    keys.includes('blog-post-smoke'),
    `expected 'blog-post-smoke' key, got: ${keys.join(', ')}`
  );
});

test('registry: every entry has fn, description (non-empty), pages (non-empty array)', async () => {
  const mod = await loadTypeScriptModule(registryUrl);
  const { SCENARIO_REGISTRY } = mod;
  for (const [id, entry] of Object.entries(SCENARIO_REGISTRY)) {
    assert.equal(
      typeof entry.fn,
      'function',
      `${id}.fn must be a function (got ${typeof entry.fn})`
    );
    assert.equal(
      typeof entry.description,
      'string',
      `${id}.description must be a string`
    );
    assert.ok(
      entry.description.length > 0,
      `${id}.description must be non-empty`
    );
    assert.ok(
      Array.isArray(entry.pages),
      `${id}.pages must be an array`
    );
    assert.ok(
      entry.pages.length > 0,
      `${id}.pages must list at least one POM`
    );
  }
});

test('registry: unknown scenario lookup returns undefined', async () => {
  const mod = await loadTypeScriptModule(registryUrl);
  const { SCENARIO_REGISTRY } = mod;
  assert.equal(SCENARIO_REGISTRY['does-not-exist'], undefined);
});

test('smoke options: 1 VU / 1 iter / shared-iterations / chromium browser', async () => {
  const mod = await loadSmokeOptions();
  const { options } = mod;
  assert.ok(options, 'options must be exported from lib/simulations/smoke.ts');
  assert.ok(options.scenarios, 'options.scenarios must exist');
  // The k6 scenario key inside options.scenarios is `browser` (NOT the easyk6
  // scenario id — that comes from __ENV.SCENARIO). RESEARCH §2.1.
  const sc = options.scenarios.browser;
  assert.ok(sc, "options.scenarios.browser must exist");
  assert.equal(sc.executor, 'shared-iterations');
  assert.equal(sc.vus, 1);
  assert.equal(sc.iterations, 1);
  assert.equal(sc.options.browser.type, 'chromium');
});

test('smoke options: thresholds use D-66 verbatim strings', async () => {
  const mod = await loadSmokeOptions();
  const { options } = mod;
  assert.ok(options.thresholds, 'options.thresholds must exist');
  // D-66 — these literal strings must match VERBATIM (single-element arrays).
  assert.deepEqual(
    options.thresholds.browser_web_vital_lcp,
    ['p(95)<3000']
  );
  assert.deepEqual(
    options.thresholds.http_req_failed,
    ['rate<0.01']
  );
  assert.deepEqual(
    options.thresholds.iteration_duration,
    ['p(95)<15000']
  );
});
