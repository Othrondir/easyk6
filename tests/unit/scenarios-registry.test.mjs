// tests/unit/scenarios-registry.test.mjs
// Wave-2 (Plan 03-02 Task 1) — registry-shape tests stay green against the
// real scenario imports.
//
// Loader evolution:
//
// In Plan 03-01 `lib/scenarios/index.ts` only carried `import type` lines
// (selectors + Page) so the single-source `loadTypeScriptModule` from
// `tests/unit/runtime-config.test.mjs:20-32` could transpile and import it
// directly — types get erased, leaving a registry module with no runtime
// resolution requirements.
//
// In Plan 03-02 the registry now imports real value-level exports from
// `./home-smoke` and `./blog-post-smoke`. Those relative specifiers cannot be
// resolved against a `data:` URL base ("Invalid relative URL or base scheme
// is not hierarchical"). So we apply the multi-source data-URL stitching
// pattern from `tests/unit/k6page-base.test.mjs:23-58`, generalized to N
// specifiers: pre-transpile each scenario file with its `@pages/*` value
// imports stubbed to empty data URLs, embed each transpiled module as a data
// URL, then rewrite the `from './home-smoke'` / `from './blog-post-smoke'`
// literals in `index.ts` to point at those data URLs BEFORE transpiling
// `index.ts` itself.
//
// `lib/simulations/smoke.ts` already used the multi-source pattern in
// Plan 03-01 — that loader (`loadSmokeOptions`) is unchanged.

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

// ---------- Multi-source TypeScript loader for lib/scenarios/index.ts ----------
// Pre-transpiles `./home-smoke` and `./blog-post-smoke` with their `@pages/*`
// imports stubbed, encodes them as data URLs, then rewrites the index.ts
// import literals to those data URLs before its own transpile.
//
// The scenario fn bodies are NEVER invoked from these tests — only the
// registry's KEYS and METADATA (description, pages, typeof fn) are asserted —
// so the stubs only need parse-time correctness. The `@pages/HomePage` /
// `@pages/PostPage` and `k6` stubs export the symbols the scenario files
// reference at module-init time (the class identifiers + `sleep`), nothing
// more.
async function loadScenarioRegistry() {
  // Step 1: stub specifiers that the scenario files import at module-init.
  const scenarioStubs = {
    k6: 'export const sleep = () => {};',
    '@pages/HomePage': 'export class HomePage { constructor() {} }',
    '@pages/PostPage': 'export class PostPage { constructor() {} }',
  };
  const scenarioStubDataUrls = {};
  for (const [specifier, source] of Object.entries(scenarioStubs)) {
    const encoded = Buffer.from(source, 'utf8').toString('base64');
    scenarioStubDataUrls[specifier] =
      `data:text/javascript;base64,${encoded}`;
  }

  // Step 2: transpile each scenario file with its imports rewritten.
  async function buildScenarioDataUrl(relPath) {
    const filePath = path.join(projectRoot, 'lib', 'scenarios', relPath);
    let src = await readFile(filePath, 'utf8');
    for (const [specifier, dataUrl] of Object.entries(scenarioStubDataUrls)) {
      const escaped = specifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      src = src.replace(
        new RegExp(`from\\s+['"]${escaped}['"]`, 'g'),
        `from '${dataUrl}'`
      );
    }
    // Also strip `import type { ScenarioFn } from './index'` (a type-only
    // import that the scenarios use). `ts.transpileModule` already elides
    // type-only imports written with the `import type` form, so this is a
    // no-op in practice — but defensive: ensure no `./index` literal remains.
    const { outputText } = ts.transpileModule(src, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2020,
      },
      fileName: filePath,
    });
    const encoded = Buffer.from(outputText, 'utf8').toString('base64');
    return `data:text/javascript;base64,${encoded}`;
  }

  const homeUrl = await buildScenarioDataUrl('home-smoke.ts');
  const blogUrl = await buildScenarioDataUrl('blog-post-smoke.ts');

  // Step 3: rewrite the relative imports in index.ts to the scenario data URLs.
  const indexPath = path.join(projectRoot, 'lib', 'scenarios', 'index.ts');
  let indexSrc = await readFile(indexPath, 'utf8');
  indexSrc = indexSrc.replace(
    /from\s+['"]\.\/home-smoke['"]/g,
    `from '${homeUrl}'`
  );
  indexSrc = indexSrc.replace(
    /from\s+['"]\.\/blog-post-smoke['"]/g,
    `from '${blogUrl}'`
  );

  const { outputText } = ts.transpileModule(indexSrc, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: indexPath,
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

// ---------- Tests ----------

test('registry: exposes home-smoke and blog-post-smoke keys', async () => {
  const mod = await loadScenarioRegistry();
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

test('registry: every entry has fn (arity 1), description (non-empty), pages (non-empty array)', async () => {
  const mod = await loadScenarioRegistry();
  const { SCENARIO_REGISTRY } = mod;
  for (const [id, entry] of Object.entries(SCENARIO_REGISTRY)) {
    assert.equal(
      typeof entry.fn,
      'function',
      `${id}.fn must be a function (got ${typeof entry.fn})`
    );
    // Plan 03-02 tightening: real ScenarioFn takes one ctx argument.
    assert.equal(
      entry.fn.length,
      1,
      `${id}.fn must accept exactly one argument (got arity ${entry.fn.length})`
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
  const mod = await loadScenarioRegistry();
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
