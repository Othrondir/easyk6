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

/**
 * Load the K6Page class together with its sibling K6PlaywrightSelectors.
 *
 * `ts.transpileModule` only emits text — it does NOT resolve imports. The
 * runtime data-URL `import` DOES resolve relative specifiers, so we have to
 * replace the `from './selectors'` literal in the transpiled base-page source
 * with a data URL that contains the transpiled selectors module. Concatenating
 * via base64 keeps the loader portable on Windows + POSIX without a temp dir.
 */
async function loadK6PageWithSelectors() {
  const selectorsSrc = await readFile(
    path.join(projectRoot, 'lib', 'pages', 'base', 'selectors.ts'),
    'utf8'
  );
  const selectorsJs = ts.transpileModule(selectorsSrc, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const selectorsUrl =
    'data:text/javascript;base64,' +
    Buffer.from(selectorsJs, 'utf8').toString('base64');

  const baseSrc = await readFile(
    path.join(projectRoot, 'lib', 'pages', 'base', 'base-page.ts'),
    'utf8'
  );
  // Rewrite `from './selectors'` (single or double quotes) to point at the
  // base64 selectors data URL so the dynamic `import()` resolves.
  const rewritten = baseSrc.replace(
    /from\s+['"]\.\/selectors['"]/g,
    `from '${selectorsUrl}'`
  );
  const baseJs = ts.transpileModule(rewritten, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const baseUrl =
    'data:text/javascript;base64,' +
    Buffer.from(baseJs, 'utf8').toString('base64');

  return import(baseUrl);
}

function makeFakePage({ withWaitForLoadState = false } = {}) {
  const calls = [];
  const fakePage = {
    goto: (url) => {
      calls.push(['goto', url]);
      return Promise.resolve();
    },
    locator: (sel) => {
      calls.push(['locator', sel]);
      return {};
    },
  };
  if (withWaitForLoadState) {
    fakePage.waitForLoadState = (state) => {
      calls.push(['waitForLoadState', state]);
      return Promise.resolve();
    };
  }
  return { fakePage, calls };
}

test('K6Page constructor accepts a Page and stores it', async () => {
  const { K6Page } = await loadK6PageWithSelectors();

  // Inline TestPage class — no separate fixture file. Mirrors the
  // tests/unit/perf-runner.test.mjs pattern of building helpers in-test.
  class TestPage extends K6Page {
    getPage() {
      return this.page;
    }
    getSelectors() {
      return this.selectors;
    }
    setPageUrl(url) {
      this.pageUrl = url;
    }
  }

  const { fakePage } = makeFakePage();
  const tp = new TestPage(fakePage);
  assert.equal(tp.getPage(), fakePage, 'K6Page should store the Page passed to its constructor');
});

test('K6Page exposes a `selectors` instance', async () => {
  const { K6Page } = await loadK6PageWithSelectors();

  class TestPage extends K6Page {
    getSelectors() {
      return this.selectors;
    }
  }

  const { fakePage } = makeFakePage();
  const tp = new TestPage(fakePage);
  const selectors = tp.getSelectors();
  assert.ok(selectors, 'selectors must be truthy');
  assert.equal(typeof selectors.getByTestId, 'function');
  assert.equal(typeof selectors.getByText, 'function');
});

test('K6Page.navigate() calls page.goto when pageUrl is set', async () => {
  const { K6Page } = await loadK6PageWithSelectors();

  class TestPage extends K6Page {
    setPageUrl(url) {
      this.pageUrl = url;
    }
  }

  const { fakePage, calls } = makeFakePage({ withWaitForLoadState: true });
  const tp = new TestPage(fakePage);
  tp.setPageUrl('https://example.test/');
  await tp.navigate();
  const gotoCalls = calls.filter((c) => c[0] === 'goto');
  assert.deepEqual(gotoCalls, [['goto', 'https://example.test/']]);
});

test('K6Page.navigate() does NOT call page.goto when pageUrl is empty', async () => {
  const { K6Page } = await loadK6PageWithSelectors();

  class TestPage extends K6Page {}

  const { fakePage, calls } = makeFakePage({ withWaitForLoadState: true });
  const tp = new TestPage(fakePage);
  // Default pageUrl is '' per the K6Page contract.
  await tp.navigate();
  const gotoCalls = calls.filter((c) => c[0] === 'goto');
  assert.deepEqual(gotoCalls, [], 'goto must not be called when pageUrl is empty');
});

test('K6Page.waitForLoadState() is a no-op when the underlying page lacks waitForLoadState', async () => {
  const { K6Page } = await loadK6PageWithSelectors();

  class TestPage extends K6Page {}

  const { fakePage } = makeFakePage({ withWaitForLoadState: false });
  const tp = new TestPage(fakePage);

  // Must not throw — A1 feature-detect path.
  await tp.waitForLoadState();
  await tp.waitForLoadState('domcontentloaded');
  assert.ok(true, 'waitForLoadState must be a silent no-op when missing');
});

test('K6Page.waitForLoadState() forwards to page.waitForLoadState when present', async () => {
  const { K6Page } = await loadK6PageWithSelectors();

  class TestPage extends K6Page {}

  const { fakePage, calls } = makeFakePage({ withWaitForLoadState: true });
  const tp = new TestPage(fakePage);
  await tp.waitForLoadState();
  const waitCalls = calls.filter((c) => c[0] === 'waitForLoadState');
  assert.deepEqual(waitCalls, [['waitForLoadState', 'networkidle']]);

  // Custom state forwards too.
  await tp.waitForLoadState('domcontentloaded');
  const allWaits = calls.filter((c) => c[0] === 'waitForLoadState');
  assert.deepEqual(allWaits, [
    ['waitForLoadState', 'networkidle'],
    ['waitForLoadState', 'domcontentloaded'],
  ]);
});
