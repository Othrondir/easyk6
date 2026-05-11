// tests/unit/simulations-load.test.mjs
// Plan 04-02 Wave 0 RED → Wave 1 GREEN — load.ts options literal contract.
//
// Asserts that lib/simulations/load.ts exports the correct `options` literal
// per Plan 04-02 must_haves + CONTEXT D-01..D-04 (amended 2026-05-11 for
// browser_http_req_duration retargeting per RESEARCH §5 Pitfall 1).
//
// Loader pattern: multi-source data-URL stitching from
// tests/unit/scenarios-registry.test.mjs::loadSmokeOptions (lines 124-180).
// The 6 stubs are IDENTICAL to loadSmokeOptions's (k6/browser, k6/execution,
// @lib/scenarios, @pages/base/selectors, @config, ./lib/summary) — only the
// target source-file path differs.

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

async function loadLoadOptions() {
  const stubs = {
    'k6/browser': 'export const browser = { newPage: async () => null };',
    'k6/execution': 'export default { test: { abort: () => {} } };',
    '@lib/scenarios': 'export const SCENARIO_REGISTRY = {};',
    '@pages/base/selectors':
      'export class K6PlaywrightSelectors { constructor() {} }',
    '@config':
      'export function resolveRuntimeConfig() { return { profile: "load", scenario: "home-smoke", baseUrl: "https://example.test/", demo: false, envFile: ".env", showConfig: false, dryRun: false, entryFile: "dist/simulations/load.js" }; }',
    './lib/summary':
      'export function makeHandleSummary() { return () => ({}); }',
  };

  const stubDataUrls = {};
  for (const [specifier, source] of Object.entries(stubs)) {
    const encoded = Buffer.from(source, 'utf8').toString('base64');
    stubDataUrls[specifier] = `data:text/javascript;base64,${encoded}`;
  }

  const loadPath = path.join(projectRoot, 'lib', 'simulations', 'load.ts');
  let src = await readFile(loadPath, 'utf8');

  for (const [specifier, dataUrl] of Object.entries(stubDataUrls)) {
    const escaped = specifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    src = src.replace(
      new RegExp(`from\\s+['"]${escaped}['"]`, 'g'),
      `from '${dataUrl}'`
    );
  }

  const { outputText } = ts.transpileModule(src, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: loadPath,
  });
  const encoded = Buffer.from(outputText, 'utf8').toString('base64');
  return import(`data:text/javascript;base64,${encoded}`);
}

// ---------- Tests ----------

test('load options: ramping-vus executor with 3 stages [30s→5, 60s@5, 30s→0]', async () => {
  const mod = await loadLoadOptions();
  const { options } = mod;
  assert.ok(options, 'options must be exported from lib/simulations/load.ts');
  const sc = options.scenarios.browser;
  assert.ok(sc, 'options.scenarios.browser must exist');
  assert.equal(sc.executor, 'ramping-vus');
  assert.deepEqual(sc.stages, [
    { duration: '30s', target: 5 },
    { duration: '60s', target: 5 },
    { duration: '30s', target: 0 },
  ]);
});

test('load options: chromium browser type', async () => {
  const mod = await loadLoadOptions();
  const { options } = mod;
  assert.equal(options.scenarios.browser.options.browser.type, 'chromium');
});

test('load options: gracefulRampDown=30s and startVUs=0', async () => {
  const mod = await loadLoadOptions();
  const { options } = mod;
  const sc = options.scenarios.browser;
  assert.equal(sc.startVUs, 0);
  assert.equal(sc.gracefulRampDown, '30s');
});

test('load options: D-03 amended thresholds — browser_web_vital_lcp p(95)<4000', async () => {
  const mod = await loadLoadOptions();
  const { options } = mod;
  assert.ok(options.thresholds, 'options.thresholds must exist');
  assert.deepEqual(options.thresholds.browser_web_vital_lcp, ['p(95)<4000']);
});

test('load options: D-03 amended threshold — browser_http_req_duration p(95)<2000 (NOT http_req_duration)', async () => {
  const mod = await loadLoadOptions();
  const { options } = mod;
  // CONTEXT 2026-05-11 amendment + RESEARCH §5 Pitfall 1: k6/browser routes
  // HTTP through chromium, leaving http_req_* empty. The load profile MUST
  // target browser_http_req_duration to get a real load-relevant signal.
  assert.deepEqual(options.thresholds.browser_http_req_duration, [
    'p(95)<2000',
  ]);
});

test('load options: all 4 thresholds present (browser_web_vital_lcp, http_req_failed, iteration_duration, browser_http_req_duration)', async () => {
  const mod = await loadLoadOptions();
  const { options } = mod;
  const keys = Object.keys(options.thresholds).sort();
  assert.deepEqual(keys, [
    'browser_http_req_duration',
    'browser_web_vital_lcp',
    'http_req_failed',
    'iteration_duration',
  ]);
  assert.deepEqual(options.thresholds.http_req_failed, ['rate<0.05']);
  assert.deepEqual(options.thresholds.iteration_duration, ['p(95)<25000']);
});

test('load options: thresholds map does NOT contain key http_req_duration (anti-regression for amended D-03)', async () => {
  const mod = await loadLoadOptions();
  const { options } = mod;
  // Negative-space anti-regression: pre-amendment D-03 used `http_req_duration`
  // which is empty in browser scenarios. The 2026-05-11 amendment retargeted
  // to `browser_http_req_duration`. This assertion locks the contract end-to-end.
  assert.equal(
    options.thresholds.http_req_duration,
    undefined,
    'D-03 amendment: load uses browser_http_req_duration NOT http_req_duration'
  );
});
