import test from 'node:test';
import assert from 'node:assert/strict';

import {
  stripPlaywrightImports,
  stripLocalBasePageImports,
  stripDuplicateK6Imports,
  injectK6Imports,
  ensureExtendsK6Page,
  ensureSuperPageCall,
  transformExpectAssertions,
  transformLocatorShortcuts,
  transformGetByMethods,
  stripPageFieldShadow,
  computeK6ImportPath,
  hasResidualExpectCompat,
} from '../../scripts/lib/transforms.mjs';

test('R1: stripPlaywrightImports removes @playwright/test import lines', () => {
  const input =
    "import { Page, Locator, expect } from '@playwright/test';\nclass Foo {}";
  const out = stripPlaywrightImports(input);
  assert.doesNotMatch(out, /@playwright\/test/);
  assert.match(out, /class Foo \{\}/);
});

test('R2: stripDuplicateK6Imports drops a pre-existing k6/browser import line', () => {
  const input =
    "import { Page, Locator } from 'k6/browser';\nclass Foo {}";
  const out = stripDuplicateK6Imports(input);
  assert.doesNotMatch(out, /k6\/browser/);
  assert.match(out, /class Foo \{\}/);
});

test('R3 (top-level): injectK6Imports adds Page/Locator + K6Page imports', () => {
  const input = "import x from 'y';\nclass Foo {}";
  const out = injectK6Imports(input, './base/base-page', false);
  assert.match(out, /from 'k6\/browser'/);
  assert.match(out, /K6Page/);
  assert.doesNotMatch(out, /k6-testing-wrapper/);
});

test('R3+R4 (with expect): injectK6Imports also injects k6-testing-wrapper when includeExpect=true', () => {
  const input = "import x from 'y';\nclass Foo {}";
  const out = injectK6Imports(input, './base/base-page', true);
  assert.match(out, /from 'k6\/browser'/);
  assert.match(out, /K6Page/);
  assert.match(out, /@lib\/vendor\/k6-testing-wrapper\.js/);
});

test('R5 (basic): ensureExtendsK6Page adds extends K6Page to plain class', () => {
  const input = 'class HomePage {';
  const out = ensureExtendsK6Page(input);
  assert.match(out, /class HomePage extends K6Page \{/);
});

test('R5 (easyk6 adaptation): ensureExtendsK6Page rewrites extends BasePage to extends K6Page', () => {
  const input = 'class HomePage extends BasePage {';
  const out = ensureExtendsK6Page(input);
  assert.match(out, /class HomePage extends K6Page \{/);
  assert.doesNotMatch(out, /BasePage/);
});

test('R7: ensureSuperPageCall injects super(page) when missing', () => {
  const input = [
    'class Foo {',
    '  constructor(page: Page) {',
    '    this.x = 1;',
    '  }',
    '}',
  ].join('\n');
  const out = ensureSuperPageCall(input);
  assert.match(out, /super\(page\);/);
  // super(page); must appear before the assignment line.
  const superIdx = out.indexOf('super(page);');
  const xIdx = out.indexOf('this.x = 1');
  assert.ok(superIdx > 0 && superIdx < xIdx, 'super(page); must be before existing body');
});

test('R8 simple: expect(this.button).toBeVisible() rewrites to await waitFor visible', () => {
  const input = 'await expect(this.button).toBeVisible();';
  const out = transformExpectAssertions(input);
  assert.match(out, /await this\.button\.waitFor\(\{ state: 'visible' \}\);/);
});

test('R8 with timeout: preserves numeric timeout in waitFor opts', () => {
  const input = 'await expect(this.x).toBeVisible({ timeout: 3000 });';
  const out = transformExpectAssertions(input);
  assert.match(out, /await this\.x\.waitFor\(\{ state: 'visible', timeout: 3000 \}\);/);
});

test('R8 nested (walker): handles expect(this.x.filter({hasText:y})).toBeVisible() via balanced-paren walker', () => {
  const input = "await expect(this.x.filter({ hasText: 'a' })).toBeVisible();";
  const out = transformExpectAssertions(input);
  assert.match(
    out,
    /await this\.x\.filter\(\{ hasText: 'a' \}\)\.waitFor\(\{ state: 'visible' \}\);/
  );
});

test('R9: not.toBeVisible rewrites to waitFor hidden', () => {
  const input = 'await expect(this.x).not.toBeVisible();';
  const out = transformExpectAssertions(input);
  assert.match(out, /await this\.x\.waitFor\(\{ state: 'hidden' \}\);/);
});

test('R10: toBeHidden rewrites to waitFor hidden', () => {
  const input = 'await expect(this.x).toBeHidden();';
  const out = transformExpectAssertions(input);
  assert.match(out, /await this\.x\.waitFor\(\{ state: 'hidden' \}\);/);
});

test('R11: toBeEnabled rewrites to waitFor visible', () => {
  const input = 'await expect(this.x).toBeEnabled();';
  const out = transformExpectAssertions(input);
  assert.match(out, /await this\.x\.waitFor\(\{ state: 'visible' \}\);/);
});

test('R12: unsupported expect (toHaveText) is commented with // k6-compat: prefix', () => {
  const input = "await expect(loc).toHaveText('hi');";
  const out = transformExpectAssertions(input);
  assert.match(out, /\/\/ k6-compat:.*toHaveText/);
});

test('R13: .first() → .nth(0)', () => {
  const out = transformLocatorShortcuts('x.first()');
  assert.equal(out, 'x.nth(0)');
});

test('R14: .last() → .nth(-1)', () => {
  const out = transformLocatorShortcuts('x.last()');
  assert.equal(out, 'x.nth(-1)');
});

test('R15: .clear() → .fill(\'\')', () => {
  const out = transformLocatorShortcuts('x.clear()');
  assert.equal(out, "x.fill('')");
});

test('R16: this.page.getByTitle(\'Save\') rewrites to locator [title="Save"] (single-quote variant)', () => {
  const out = transformGetByMethods("this.page.getByTitle('Save')");
  assert.equal(out, 'this.page.locator(\'[title="Save"]\')');
});

test('R16: this.page.getByTitle("Save") double-quote variant also rewrites', () => {
  const out = transformGetByMethods('this.page.getByTitle("Save")');
  assert.equal(out, 'this.page.locator(\'[title="Save"]\')');
});

test('R17: this.page.getByText(...) → this.selectors.getByText(...)', () => {
  const out = transformGetByMethods("this.page.getByText('hi')");
  assert.equal(out, "this.selectors.getByText('hi')");
});

test('R17: this.page.getByRole(...) → this.selectors.getByRole(...)', () => {
  const out = transformGetByMethods("this.page.getByRole('button')");
  assert.equal(out, "this.selectors.getByRole('button')");
});

test('R17: this.page.getByTestId(...) → this.selectors.getByTestId(...)', () => {
  const out = transformGetByMethods("this.page.getByTestId('foo')");
  assert.equal(out, "this.selectors.getByTestId('foo')");
});

test('R18: bare page.getByTestId(...) (no this.) → this.selectors.getByTestId(...)', () => {
  // Use a leading space to avoid `this.` prefix.
  const out = transformGetByMethods(" page.getByTestId('foo')");
  assert.equal(out, " this.selectors.getByTestId('foo')");
});

test('R19: this.page.locator("X", { hasText: Y }) → backtick has-text template', () => {
  const out = transformGetByMethods("this.page.locator('a', { hasText: 'go' })");
  assert.match(out, /this\.page\.locator\(`a:has-text\("\$\{'go'\}"\)`\)/);
});

test('R28: stripPageFieldShadow removes `protected readonly page: Page;` line', () => {
  const input = '  protected readonly page: Page;\n  other(): void {}';
  const out = stripPageFieldShadow(input);
  assert.doesNotMatch(out, /page:\s*Page;/);
  assert.match(out, /other\(\):\s*void\s*\{\}/);
});

test('R28: stripPageFieldShadow also removes `private readonly page: Page;`', () => {
  const input = '  private readonly page: Page;\n  next();';
  const out = stripPageFieldShadow(input);
  assert.doesNotMatch(out, /page:\s*Page;/);
  assert.match(out, /next\(\);/);
});

test('computeK6ImportPath: top-level (HomePage.ts) → ./base/base-page', () => {
  assert.equal(computeK6ImportPath('HomePage.ts'), './base/base-page');
});

test('computeK6ImportPath: nested (components/Nav.ts) → ../base/base-page', () => {
  assert.equal(computeK6ImportPath('components/Nav.ts'), '../base/base-page');
});

test('hasResidualExpectCompat: true when a // k6-compat: expect line exists', () => {
  const input = '  // k6-compat: expect(x).toHaveText("hi");';
  assert.equal(hasResidualExpectCompat(input), true);
});

test('hasResidualExpectCompat: false when no // k6-compat: expect line exists', () => {
  const input = '  // ordinary comment\n  doSomething();';
  assert.equal(hasResidualExpectCompat(input), false);
});

test("R6a: stripLocalBasePageImports removes `import { BasePage } from './BasePage';` line", () => {
  const input =
    "import { Page } from 'k6/browser';\nimport { BasePage } from './BasePage';\nclass HomePage extends K6Page {}";
  const out = stripLocalBasePageImports(input);
  assert.doesNotMatch(out, /import\s+\{\s*BasePage\s*\}\s+from\s+['"]\.\/?BasePage['"]/);
  assert.match(out, /class HomePage extends K6Page \{\}/);
  assert.match(out, /import \{ Page \} from 'k6\/browser'/); // unrelated import preserved
});

test("R6a: stripLocalBasePageImports leaves unrelated imports untouched", () => {
  const input =
    "import { Something } from './BasePage';\nimport { BasePage } from '@other/BasePage';\nclass X extends K6Page {}";
  const out = stripLocalBasePageImports(input);
  assert.match(out, /import \{ Something \} from '\.\/BasePage'/);
  assert.match(out, /import \{ BasePage \} from '@other\/BasePage'/);
  assert.match(out, /class X extends K6Page \{\}/);
});
