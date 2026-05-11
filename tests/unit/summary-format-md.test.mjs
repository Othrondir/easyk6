// tests/unit/summary-format-md.test.mjs
// Wave-0 RED (Plan 04-01 Task 1) — pure markdown formatter tests for
// `lib/simulations/lib/format-md.ts`. The formatter does NOT exist yet, so
// every test here SHOULD fail at load-time with an ENOENT error against the
// not-yet-authored `format-md.ts`. Wave-1 GREEN (Task 2) lands the file and
// turns these 5 tests green.
//
// Pattern source: tests/unit/runtime-config.test.mjs:20-32 single-source
// `loadTypeScriptModule` helper. `format-md.ts` has ZERO relative imports
// (it's a pure function), so the multi-source data-URL stitch from
// scenarios-registry.test.mjs is unnecessary here.

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

const formatMdPath = new URL(
  '../../lib/simulations/lib/format-md.ts',
  import.meta.url
);
const { formatMarkdown } = await loadTypeScriptModule(formatMdPath);

// ---------- Fixtures ----------
// Smoke-shape data: `browser_http_req_duration` has zero/missing samples
// because k6/browser routes HTTP through chromium and leaves the k6/http
// metric series empty (RESEARCH §5 Pitfall 1; Phase 03-02 SUMMARY Run 1
// evidence). The formatter must render the literal string
// `n/a (no samples — browser scenario)` for the row in that case.
const SMOKE_SHAPE_DATA = {
  metrics: {
    browser_web_vital_lcp: {
      type: 'trend',
      contains: 'time',
      values: { avg: 572, min: 572, max: 572, med: 572, 'p(90)': 572, 'p(95)': 572 },
      thresholds: { 'p(95)<3000': { ok: true } },
    },
    http_req_failed: {
      type: 'rate',
      contains: 'default',
      values: { rate: 0.0, passes: 0, fails: 0 },
      thresholds: { 'rate<0.01': { ok: true } },
    },
    iteration_duration: {
      type: 'trend',
      contains: 'time',
      values: { avg: 2310, min: 2310, max: 2310, med: 2310, 'p(90)': 2310, 'p(95)': 2310 },
      thresholds: { 'p(95)<15000': { ok: true } },
    },
    browser_data_received: {
      type: 'counter',
      contains: 'data',
      values: { count: 1800000, rate: 640000 },
    },
    browser_http_req_duration: {
      // 0-sample browser-scenario case: empty values → `n/a (no samples)` row.
      type: 'trend',
      contains: 'time',
      values: { avg: 0, min: 0, max: 0, med: 0, 'p(90)': 0, 'p(95)': 0 },
    },
  },
};

// Load-shape data: same skeleton with real `browser_http_req_duration`
// samples (load profile drives real chromium HTTP per RESEARCH Pitfall 1).
// Uses the 224.39 ms value from Phase 03-02 SUMMARY Run 1 evidence.
const LOAD_SHAPE_DATA = {
  metrics: {
    browser_web_vital_lcp: {
      type: 'trend',
      contains: 'time',
      values: { avg: 700, min: 600, max: 900, med: 720, 'p(90)': 850, 'p(95)': 880 },
      thresholds: { 'p(95)<4000': { ok: true } },
    },
    http_req_failed: {
      type: 'rate',
      contains: 'default',
      values: { rate: 0.0, passes: 100, fails: 0 },
      thresholds: { 'rate<0.05': { ok: true } },
    },
    iteration_duration: {
      type: 'trend',
      contains: 'time',
      values: { avg: 2500, min: 2200, max: 3000, med: 2450, 'p(90)': 2800, 'p(95)': 2950 },
      thresholds: { 'p(95)<25000': { ok: true } },
    },
    browser_data_received: {
      type: 'counter',
      contains: 'data',
      values: { count: 50000000, rate: 200000 },
    },
    browser_http_req_duration: {
      type: 'trend',
      contains: 'time',
      values: { avg: 188.29, min: 143.73, med: 197.79, max: 227.36, 'p(90)': 221.42, 'p(95)': 224.39 },
      thresholds: { 'p(95)<2000': { ok: true } },
    },
  },
};

// ---------- Tests ----------

test('formatMarkdown: header section includes profile, scenario, baseUrl, runDateIso', () => {
  const md = formatMarkdown(SMOKE_SHAPE_DATA, {
    profile: 'smoke',
    scenario: 'home-smoke',
    baseUrl: 'https://othrondir.github.io/QAbbalah/',
    runDateIso: '2026-05-11T17:33:15.000Z',
  });
  assert.ok(md.includes('smoke'), 'header must include profile');
  assert.ok(md.includes('home-smoke'), 'header must include scenario');
  assert.ok(
    md.includes('https://othrondir.github.io/QAbbalah/'),
    'header must include base URL'
  );
  assert.ok(
    md.includes('2026-05-11T17:33:15.000Z'),
    'header must include runDateIso'
  );
});

test('formatMarkdown: thresholds table renders ✅ PASS / ❌ FAIL per .ok', () => {
  const passMd = formatMarkdown(SMOKE_SHAPE_DATA, {
    profile: 'smoke',
    scenario: 'home-smoke',
    baseUrl: 'https://x/',
    runDateIso: '2026-05-11T00:00:00.000Z',
  });
  // PASS verdict from `.ok: true` against the smoke fixture.
  assert.ok(
    passMd.includes('browser_web_vital_lcp'),
    'threshold row for browser_web_vital_lcp must be present'
  );
  assert.ok(passMd.includes('p(95)<3000'), 'bound string must be present');
  assert.ok(passMd.includes('✅ PASS'), 'PASS verdict must render');

  // FAIL case: force `.ok: false` on one threshold.
  const failingData = JSON.parse(JSON.stringify(SMOKE_SHAPE_DATA));
  failingData.metrics.browser_web_vital_lcp.thresholds['p(95)<3000'].ok = false;
  const failMd = formatMarkdown(failingData, {
    profile: 'smoke',
    scenario: 'home-smoke',
    baseUrl: 'https://x/',
    runDateIso: '2026-05-11T00:00:00.000Z',
  });
  assert.ok(failMd.includes('❌ FAIL'), 'FAIL verdict must render');
});

test('formatMarkdown: key metrics renders `n/a (no samples — browser scenario)` when browser_http_req_duration p(95) is 0', () => {
  const md = formatMarkdown(SMOKE_SHAPE_DATA, {
    profile: 'smoke',
    scenario: 'home-smoke',
    baseUrl: 'https://x/',
    runDateIso: '2026-05-11T00:00:00.000Z',
  });
  assert.ok(
    md.includes('n/a (no samples — browser scenario)'),
    'smoke-shape fixture must produce the empty-metric fallback string'
  );
});

test('formatMarkdown: key metrics renders `<ms>ms` for browser_http_req_duration p(95) when positive', () => {
  const md = formatMarkdown(LOAD_SHAPE_DATA, {
    profile: 'load',
    scenario: 'home-smoke',
    baseUrl: 'https://x/',
    runDateIso: '2026-05-11T00:00:00.000Z',
  });
  // Allow integer or decimal (224ms or 224.39ms).
  assert.match(
    md,
    /22[0-9](\.[0-9]+)?ms/u,
    'load-shape fixture must render the browser_http_req_duration p(95) as ms'
  );
  // Sanity: the explicit "no samples" string must NOT appear in load shape.
  assert.ok(
    !md.includes('n/a (no samples — browser scenario)'),
    'load-shape fixture must NOT render the empty-metric fallback string'
  );
  // Direct match against the fixture value 224.39 for tightening.
  assert.ok(
    md.includes('224.39'),
    'load-shape fixture must render the 224.39 p(95) value'
  );
});

test('formatMarkdown: footer points to the JSON sibling', () => {
  const md = formatMarkdown(SMOKE_SHAPE_DATA, {
    profile: 'smoke',
    scenario: 'home-smoke',
    baseUrl: 'https://x/',
    runDateIso: '2026-05-11T00:00:00.000Z',
  });
  // Footer line per D-11 section 5: reference to the .json sibling.
  assert.ok(
    md.includes('reports/smoke-home-smoke.json'),
    'footer must reference the JSON sibling artifact'
  );
});
