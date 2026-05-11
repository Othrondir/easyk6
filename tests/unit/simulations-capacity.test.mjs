// tests/unit/simulations-capacity.test.mjs
// Plan 04-02 Wave 0 RED → Wave 1 GREEN — capacity.ts options literal contract.
//
// Asserts that lib/simulations/capacity.ts exports the correct `options`
// literal per Plan 04-02 must_haves + CONTEXT D-05..D-08 (amended 2026-05-11
// for browser_http_req_duration retargeting per RESEARCH §5 Pitfall 1).

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

async function loadCapacityOptions() {
  const stubs = {
    'k6/browser': 'export const browser = { newPage: async () => null };',
    'k6/execution': 'export default { test: { abort: () => {} } };',
    '@lib/scenarios': 'export const SCENARIO_REGISTRY = {};',
    '@pages/base/selectors':
      'export class K6PlaywrightSelectors { constructor() {} }',
    '@config':
      'export function resolveRuntimeConfig() { return { profile: "capacity", scenario: "home-smoke", baseUrl: "https://example.test/", demo: false, envFile: ".env", showConfig: false, dryRun: false, entryFile: "dist/simulations/capacity.js" }; }',
    './lib/summary':
      'export function makeHandleSummary() { return () => ({}); }',
  };

  const stubDataUrls = {};
  for (const [specifier, source] of Object.entries(stubs)) {
    const encoded = Buffer.from(source, 'utf8').toString('base64');
    stubDataUrls[specifier] = `data:text/javascript;base64,${encoded}`;
  }

  const capPath = path.join(projectRoot, 'lib', 'simulations', 'capacity.ts');
  let src = await readFile(capPath, 'utf8');

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
    fileName: capPath,
  });
  const encoded = Buffer.from(outputText, 'utf8').toString('base64');
  return import(`data:text/javascript;base64,${encoded}`);
}

// ---------- Tests ----------

test('capacity options: ramping-arrival-rate executor', async () => {
  const mod = await loadCapacityOptions();
  const { options } = mod;
  assert.ok(options, 'options must be exported from lib/simulations/capacity.ts');
  const sc = options.scenarios.browser;
  assert.ok(sc, 'options.scenarios.browser must exist');
  assert.equal(sc.executor, 'ramping-arrival-rate');
});

test('capacity options: startRate=0, timeUnit=1s, preAllocatedVUs=10, maxVUs=10', async () => {
  const mod = await loadCapacityOptions();
  const { options } = mod;
  const sc = options.scenarios.browser;
  assert.equal(sc.startRate, 0);
  assert.equal(sc.timeUnit, '1s');
  assert.equal(sc.preAllocatedVUs, 10);
  assert.equal(sc.maxVUs, 10);
});

test('capacity options: single 180s stage targeting 10', async () => {
  const mod = await loadCapacityOptions();
  const { options } = mod;
  const sc = options.scenarios.browser;
  assert.deepEqual(sc.stages, [{ duration: '180s', target: 10 }]);
});

test('capacity options: chromium browser type', async () => {
  const mod = await loadCapacityOptions();
  const { options } = mod;
  assert.equal(options.scenarios.browser.options.browser.type, 'chromium');
});

test('capacity options: D-08 amended thresholds — browser_http_req_duration p(95)<3000', async () => {
  const mod = await loadCapacityOptions();
  const { options } = mod;
  assert.ok(options.thresholds, 'options.thresholds must exist');
  // CONTEXT 2026-05-11 amendment + RESEARCH §5 Pitfall 1.
  assert.deepEqual(options.thresholds.browser_http_req_duration, [
    'p(95)<3000',
  ]);
});

test('capacity options: all 4 thresholds present', async () => {
  const mod = await loadCapacityOptions();
  const { options } = mod;
  const keys = Object.keys(options.thresholds).sort();
  assert.deepEqual(keys, [
    'browser_http_req_duration',
    'browser_web_vital_lcp',
    'http_req_failed',
    'iteration_duration',
  ]);
  assert.deepEqual(options.thresholds.browser_web_vital_lcp, ['p(95)<4000']);
  assert.deepEqual(options.thresholds.http_req_failed, ['rate<0.05']);
  assert.deepEqual(options.thresholds.iteration_duration, ['p(95)<30000']);
});

test('capacity options: thresholds map does NOT contain key http_req_duration (anti-regression for amended D-08)', async () => {
  const mod = await loadCapacityOptions();
  const { options } = mod;
  // Negative-space anti-regression: pre-amendment D-08 used `http_req_duration`
  // which is empty in browser scenarios. The 2026-05-11 amendment retargeted
  // to `browser_http_req_duration`.
  assert.equal(
    options.thresholds.http_req_duration,
    undefined,
    'D-08 amendment: capacity uses browser_http_req_duration NOT http_req_duration'
  );
});
