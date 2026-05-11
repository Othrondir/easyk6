// tests/unit/summary-format-json.test.mjs
// Wave-0 RED (Plan 04-01 Task 1) — pure JSON formatter tests for
// `lib/simulations/lib/format-json.ts`. The formatter does NOT exist yet, so
// every test here SHOULD fail at load-time with an ENOENT error. Wave-1
// GREEN (Task 3) lands the file and turns these 3 tests green.
//
// Pattern source: tests/unit/runtime-config.test.mjs:20-32 single-source
// `loadTypeScriptModule` helper. `format-json.ts` has ZERO relative imports
// (pure JSON.stringify wrapper).

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import ts from 'typescript';

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

const formatJsonPath = new URL(
  '../../lib/simulations/lib/format-json.ts',
  import.meta.url
);
const { formatJson } = await loadTypeScriptModule(formatJsonPath);

// Deterministic sample payload — same input always yields the same string.
const SAMPLE_DATA = {
  metrics: {
    browser_web_vital_lcp: {
      values: { 'p(95)': 572 },
      thresholds: { 'p(95)<3000': { ok: true } },
    },
    http_req_failed: { values: { rate: 0 } },
  },
  state: { testRunDurationMs: 1500 },
};

test('formatJson: returns JSON.stringify(data, null, 2) exactly', () => {
  const expected = JSON.stringify(SAMPLE_DATA, null, 2);
  const actual = formatJson(SAMPLE_DATA);
  assert.equal(actual, expected);
});

test('formatJson: output round-trips through JSON.parse', () => {
  const serialized = formatJson(SAMPLE_DATA);
  const parsed = JSON.parse(serialized);
  assert.deepEqual(parsed, SAMPLE_DATA);
});

test('formatJson: undefined data does NOT throw and returns a parseable JSON string', () => {
  // Defensive guard: a missing/undefined data payload must not crash the
  // handleSummary chain. The exact fallback string is implementation choice
  // (D-19), but the output MUST be valid JSON.
  let result;
  assert.doesNotThrow(() => {
    result = formatJson(undefined);
  });
  assert.equal(typeof result, 'string');
  // The result must be valid JSON.
  assert.doesNotThrow(() => JSON.parse(result));
});
