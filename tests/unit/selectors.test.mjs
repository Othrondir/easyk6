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

async function loadTypeScriptModule(absPath) {
  const source = await readFile(absPath, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: absPath,
  });
  const encoded = Buffer.from(outputText, 'utf8').toString('base64');
  return import(`data:text/javascript;base64,${encoded}`);
}

const selectorsPath = path.join(
  projectRoot,
  'lib',
  'pages',
  'base',
  'selectors.ts'
);

/**
 * Build a fake page that records `locator(sel)` and `locator(...).filter(...)`
 * call args. The returned locator object also exposes `.filter(...)` so chained
 * calls can be inspected.
 */
function makeRecorder({ withGetByRole = false } = {}) {
  const calls = [];

  function makeLocator(label) {
    const filterFn = (opts) => {
      calls.push(['filter', label, opts]);
      return makeLocator(label + '.filtered');
    };
    return {
      filter: filterFn,
      _label: label,
    };
  }

  const fakePage = {
    locator: (sel) => {
      calls.push(['locator', sel]);
      return makeLocator(sel);
    },
  };
  if (withGetByRole) {
    fakePage.getByRole = (role, options) => {
      calls.push(['getByRole', role, options]);
      return makeLocator('native:' + role);
    };
  }
  return { fakePage, calls };
}

test('getByTestId returns page.locator with `[data-testid="foo"]`', async () => {
  const { K6PlaywrightSelectors } = await loadTypeScriptModule(selectorsPath);
  const { fakePage, calls } = makeRecorder();
  const sel = new K6PlaywrightSelectors(fakePage);
  sel.getByTestId('foo');
  assert.deepEqual(calls[0], ['locator', '[data-testid="foo"]']);
});

test('getByText without options uses page.locator(*).filter({ hasText: text })', async () => {
  const { K6PlaywrightSelectors } = await loadTypeScriptModule(selectorsPath);
  const { fakePage, calls } = makeRecorder();
  const sel = new K6PlaywrightSelectors(fakePage);
  sel.getByText('hello');
  assert.deepEqual(calls[0], ['locator', '*']);
  // Second call is the filter
  const filterCall = calls.find((c) => c[0] === 'filter');
  assert.ok(filterCall, 'filter must be called after locator');
  assert.equal(filterCall[2].hasText, 'hello');
});

test('getByText with `{ exact: true }` wraps text in regex anchors', async () => {
  const { K6PlaywrightSelectors } = await loadTypeScriptModule(selectorsPath);
  const { fakePage, calls } = makeRecorder();
  const sel = new K6PlaywrightSelectors(fakePage);
  sel.getByText('foo', { exact: true });
  const filterCall = calls.find((c) => c[0] === 'filter');
  assert.ok(filterCall, 'filter must be called');
  const re = filterCall[2].hasText;
  assert.ok(re instanceof RegExp, 'hasText must be a RegExp when exact=true');
  assert.match('foo', re);
  assert.doesNotMatch('foobar', re);
  assert.doesNotMatch('xfoo', re);
});

test('getByRole returns page.locator with `[role="button"]` (no native)', async () => {
  const { K6PlaywrightSelectors } = await loadTypeScriptModule(selectorsPath);
  const { fakePage, calls } = makeRecorder({ withGetByRole: false });
  const sel = new K6PlaywrightSelectors(fakePage);
  sel.getByRole('button');
  assert.deepEqual(calls[0], ['locator', '[role="button"]']);
});

test('getByRole with `{ name: "Submit" }` adds filter with regex-anchored hasText', async () => {
  const { K6PlaywrightSelectors } = await loadTypeScriptModule(selectorsPath);
  const { fakePage, calls } = makeRecorder({ withGetByRole: false });
  const sel = new K6PlaywrightSelectors(fakePage);
  sel.getByRole('button', { name: 'Submit' });
  assert.deepEqual(calls[0], ['locator', '[role="button"]']);
  const filterCall = calls.find((c) => c[0] === 'filter');
  assert.ok(filterCall, 'filter must be called for name option');
  const re = filterCall[2].hasText;
  assert.ok(re instanceof RegExp, 'hasText must be a RegExp');
  assert.match('Submit', re);
  assert.doesNotMatch('Submit Form', re);
});

test('getByRole prefers native page.getByRole when available (A2 fallback)', async () => {
  const { K6PlaywrightSelectors } = await loadTypeScriptModule(selectorsPath);
  const { fakePage, calls } = makeRecorder({ withGetByRole: true });
  const sel = new K6PlaywrightSelectors(fakePage);
  sel.getByRole('button', { name: 'Save' });

  const nativeCall = calls.find((c) => c[0] === 'getByRole');
  assert.ok(nativeCall, 'native page.getByRole must be invoked');
  assert.equal(nativeCall[1], 'button');
  assert.deepEqual(nativeCall[2], { name: 'Save' });

  // Crucially, the legacy `[role="..."]` locator path must NOT be taken.
  const legacy = calls.find((c) => c[0] === 'locator' && c[1] === '[role="button"]');
  assert.equal(legacy, undefined, 'legacy locator path must not run when native getByRole exists');
});

test('filterByText calls locator.filter({ hasText })', async () => {
  const { K6PlaywrightSelectors } = await loadTypeScriptModule(selectorsPath);
  const { fakePage } = makeRecorder();
  const sel = new K6PlaywrightSelectors(fakePage);

  const filterCalls = [];
  const fakeLocator = {
    filter: (opts) => {
      filterCalls.push(opts);
      return { filtered: true };
    },
  };
  const result = sel.filterByText(fakeLocator, 'hello');
  assert.deepEqual(filterCalls, [{ hasText: 'hello' }]);
  assert.deepEqual(result, { filtered: true });
});

test('escapeRegex (tested via getByText exact) escapes special characters', async () => {
  const { K6PlaywrightSelectors } = await loadTypeScriptModule(selectorsPath);
  const { fakePage, calls } = makeRecorder();
  const sel = new K6PlaywrightSelectors(fakePage);
  sel.getByText('a.b*c', { exact: true });
  const filterCall = calls.find((c) => c[0] === 'filter');
  assert.ok(filterCall, 'filter must be called');
  const re = filterCall[2].hasText;
  assert.ok(re instanceof RegExp);
  // Source must contain escaped specials: \. \* etc.
  assert.match(re.source, /\\\./);
  assert.match(re.source, /\\\*/);
  // The literal `a.b*c` must match; metacharacter expansions must not.
  assert.match('a.b*c', re);
  assert.doesNotMatch('axbxc', re);
});
