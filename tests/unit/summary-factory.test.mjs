// tests/unit/summary-factory.test.mjs
// Wave-0 RED (Plan 04-01 Task 1) — makeHandleSummary factory tests for
// `lib/simulations/lib/summary.ts`. The factory does NOT exist yet, so
// every test here SHOULD fail at load-time with an ENOENT error against the
// not-yet-authored `summary.ts`. Wave-1 GREEN (Task 4) lands the file and
// turns these 4 tests green.
//
// Pattern source: tests/unit/scenarios-registry.test.mjs:124-180 multi-source
// data-URL loader. `summary.ts` imports `./format-md` and `./format-json`
// (sibling relative paths) — those must be rewritten to data-URL stubs before
// transpile so the dynamic import() resolves. The stubs export
// `formatMarkdown` / `formatJson` with sentinel return values that let the
// factory test assert key-naming and fallback semantics WITHOUT depending on
// the real formatter implementations.

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

async function loadSummaryFactory() {
  // Stubs: minimum parse-time-valid exports that summary.ts imports.
  // The factory test does NOT assert on formatter output — only on the keys
  // and value-shape of the Record<string, string> the returned function emits.
  const stubs = {
    './format-md':
      'export const formatMarkdown = (data, meta) => `STUB_MD profile=${meta.profile} scenario=${meta.scenario}`;',
    './format-json':
      'export const formatJson = (data) => "STUB_JSON";',
  };

  const stubDataUrls = {};
  for (const [specifier, source] of Object.entries(stubs)) {
    const encoded = Buffer.from(source, 'utf8').toString('base64');
    stubDataUrls[specifier] = `data:text/javascript;base64,${encoded}`;
  }

  const summaryPath = path.join(
    projectRoot,
    'lib',
    'simulations',
    'lib',
    'summary.ts'
  );
  let summarySrc = await readFile(summaryPath, 'utf8');

  for (const [specifier, dataUrl] of Object.entries(stubDataUrls)) {
    const escaped = specifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    summarySrc = summarySrc.replace(
      new RegExp(`from\\s+['"]${escaped}['"]`, 'g'),
      `from '${dataUrl}'`
    );
  }

  const { outputText } = ts.transpileModule(summarySrc, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: summaryPath,
  });
  const encoded = Buffer.from(outputText, 'utf8').toString('base64');
  return import(`data:text/javascript;base64,${encoded}`);
}

const { makeHandleSummary } = await loadSummaryFactory();

// Sample k6 data payload — content does not matter for factory tests because
// the stub formatters ignore `data`. Shape is irrelevant; the factory
// contract under test is the RETURNED-MAP shape.
const SAMPLE_DATA = { metrics: {} };

test('makeHandleSummary: returns a function', () => {
  const handleSummary = makeHandleSummary({
    profile: 'smoke',
    scenarioGetter: () => 'home-smoke',
    baseUrlGetter: () => 'https://x/',
  });
  assert.equal(typeof handleSummary, 'function');
});

test('makeHandleSummary: returned function output has exact keys reports/smoke-home-smoke.md + reports/smoke-home-smoke.json', () => {
  const handleSummary = makeHandleSummary({
    profile: 'smoke',
    scenarioGetter: () => 'home-smoke',
    baseUrlGetter: () => 'https://x/',
  });
  const result = handleSummary(SAMPLE_DATA);
  const keys = Object.keys(result).sort();
  assert.deepEqual(keys, [
    'reports/smoke-home-smoke.json',
    'reports/smoke-home-smoke.md',
  ]);
});

test('makeHandleSummary: scenarioGetter returning empty string falls back to home-smoke', () => {
  const handleSummary = makeHandleSummary({
    profile: 'smoke',
    scenarioGetter: () => '',
    baseUrlGetter: () => '',
  });
  const result = handleSummary(SAMPLE_DATA);
  const keys = Object.keys(result).sort();
  assert.deepEqual(
    keys,
    ['reports/smoke-home-smoke.json', 'reports/smoke-home-smoke.md'],
    'empty scenarioGetter must fall back to home-smoke'
  );
});

test('makeHandleSummary: all path keys are POSIX forward-slash (never contain backslash)', () => {
  const handleSummary = makeHandleSummary({
    profile: 'load',
    scenarioGetter: () => 'blog-post-smoke',
    baseUrlGetter: () => 'https://x/',
  });
  const result = handleSummary(SAMPLE_DATA);
  for (const key of Object.keys(result)) {
    assert.ok(
      !key.includes('\\'),
      `path key must use POSIX forward-slash, got: ${key}`
    );
    assert.ok(
      key.startsWith('reports/'),
      `path key must start with reports/, got: ${key}`
    );
  }
});
