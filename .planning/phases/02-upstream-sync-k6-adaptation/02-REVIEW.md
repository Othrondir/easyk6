---
phase: 02-upstream-sync-k6-adaptation
reviewed: 2026-05-11T00:00:00Z
depth: standard
files_reviewed: 25
files_reviewed_list:
  - PROJECT_STRUCTURE.md
  - README.md
  - lib/pages-k6-patches/HomePage.k6-patch.ts
  - lib/pages/base/base-page.ts
  - lib/pages/base/selectors.ts
  - lib/vendor/README.md
  - lib/vendor/k6-testing-wrapper.js
  - scripts/convert-pages.mjs
  - scripts/lib/patch-injector.mjs
  - scripts/lib/transforms.mjs
  - scripts/sync-src.mjs
  - tests/fixtures/upstream-fake/src/pages/HomePage.ts
  - tests/fixtures/upstream-fake/src/pages/index.ts
  - tests/fixtures/upstream/BasePage.ts
  - tests/fixtures/upstream/HomePage.ts
  - tests/fixtures/upstream/components/NavigationComponent.ts
  - tests/fixtures/upstream/index.ts
  - tests/integration/upst-03-roundtrip.test.mjs
  - tests/unit/convert-pages.test.mjs
  - tests/unit/convert-patch-injection.test.mjs
  - tests/unit/convert-roundtrip.test.mjs
  - tests/unit/convert-transforms.test.mjs
  - tests/unit/k6page-base.test.mjs
  - tests/unit/selectors.test.mjs
  - tests/unit/sync-src.test.mjs
findings:
  critical: 0
  warning: 5
  info: 6
  total: 11
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-05-11
**Depth:** standard
**Files Reviewed:** 25
**Status:** issues_found

## Summary

Phase 02 ships the upstream-sync (`scripts/sync-src.mjs`), the page-object converter (`scripts/convert-pages.mjs` + `scripts/lib/transforms.mjs` + `scripts/lib/patch-injector.mjs`), the hand-authored `K6Page` base / selector shim, and the round-trip test that drives all of them end to end. The architecture is clean, the locked-decisions trail (D-22..D-44) is well documented inline, and the test coverage of the happy path is strong.

No Critical issues found. Five Warnings cluster around fragile string-based source transforms that work on the current upstream fixture but will mis-handle realistic but slightly different inputs — multi-line imports, multi-statement lines, `expect()` inside an assignment, `// #endregion` inside a string literal, and reordered or extended `k6/browser` imports. A recruiter reading the code will see these as a robustness gap rather than a bug today, because the upstream fixture happens to fit. Tightening any one of them is a small, well-scoped change.

Six Info items track minor cleanup — an unused-variable comment, a dead `void` reference, a CJS/ESM `require` inside an ES module, and a couple of recruiter-readability nits.

## Warnings

### WR-01: stripPlaywrightImports does not handle multi-line `@playwright/test` imports

**File:** `scripts/lib/transforms.mjs:77-85`
**Issue:** The regex is anchored per-line (`split(/\r?\n/)` then `.test(line)` on each), and matches only single-line imports of the shape `import {...} from '@playwright/test';`. A multi-line import survives the strip and lands in the generated POM, which will break the converted file because `@playwright/test` is unresolvable in the k6 build:

```ts
// passes through unchanged into lib/pages/X.ts:
import {
  Page,
  expect
} from '@playwright/test';
```

Upstream `easyPlaywright` happens to keep these single-line today, so the test fixtures pass — but any reformat upstream (Prettier `printWidth`, an extra import symbol, etc.) silently re-introduces the dependency.
**Fix:** Use a multiline regex against the full string so the strip is shape-tolerant:
```js
export function stripPlaywrightImports(content) {
  return content.replace(
    /^\s*import\s+[\s\S]*?from\s+['"]@playwright\/test['"];?\s*$\r?\n?/gm,
    ''
  );
}
```
Then re-run `convert-transforms.test.mjs` and add a new case covering the multi-line shape.

---

### WR-02: transformExpectAssertions swallows trailing code on the same line as an unsupported assertion

**File:** `scripts/lib/transforms.mjs:223-253`
**Issue:** The "boundary fix" comment notes that the walker now absorbs a trailing `;` into the commented region — but it absorbs only the immediate `\s*;`. Anything *after* the semicolon on the same physical line is also commented out, silently dropping real code. Repro:

Input:
```ts
await expect(a).toHaveText('x'); doSomething();
```
Output (current):
```ts
// k6-compat: await expect(a).toHaveText("x"); doSomething();
```

`doSomething()` is dead in the generated POM, and there is no warning. Same risk shape:
```ts
const r = expect(a).toHaveText('x');   // becomes:  const r = // k6-compat: ...
```
That second case produces invalid TypeScript (assignment with no RHS expression) — `convert-roundtrip.test.mjs` would catch it only because the current fixture never wraps `expect()` in an assignment.
**Fix:** Two options, pick one:
1. Emit the comment on its own line with a newline before it, and re-emit any post-`;` content unchanged:
   ```js
   out.push(`// k6-compat: ${original}\n`);
   ```
   This forces the rare `; doSomething()` tail onto the next line where it stays executable.
2. Detect the "inside an expression" case (the `const r =` shape) by scanning backward for non-whitespace and refusing to comment — fail loudly with a clear converter error instead. The first option is safer for the recruiter showcase because it keeps the run green.

---

### WR-03: injectPatch matches `// #endregion` inside string literals

**File:** `scripts/lib/patch-injector.mjs:15-26`
**Issue:** `content.lastIndexOf('// #endregion')` is a plain substring search; it cannot distinguish a real `// #endregion` directive from one embedded in a template literal or quoted string. With realistic upstream code:

Input:
```ts
class X {
  m() { return 'foo // #endregion bar'; }
}
```
The patch is then inserted inside `m()` — between the existing method body and the (real) closing brace — which produces syntactically valid TypeScript but a method named `newMethod()` nested in the wrong scope. Failure is silent and the `convert-roundtrip` test passes because `tsc` accepts it.
**Fix:** Anchor the match to the start of a line so it only sees the directive, not the string content:
```js
const match = /^\s*\/\/ #endregion[^\n]*$/gm;
let lastEndregion = -1;
let m;
while ((m = match.exec(content)) !== null) lastEndregion = m.index;
if (lastEndregion !== -1) { /* ... existing insert ... */ }
```
A unit test covering "`// #endregion` inside a string literal must not be matched" pins the contract.

---

### WR-04: stripDuplicateK6Imports is brittle to import shape

**File:** `scripts/lib/transforms.mjs:88-101`
**Issue:** Only four exact shapes of the k6/browser import are recognized: `{ Page, Locator }`, `{ Page }`, `{ Locator }`, plus the K6Page / selectors / k6-testing-wrapper imports. Anything else slips through, e.g.:

```ts
import { Locator, Page } from 'k6/browser';                    // reversed order
import { Page, Locator, BrowserContext } from 'k6/browser';    // extra symbol
```

After `injectK6Imports` runs, the output ends up with TWO `import { Page, Locator } from 'k6/browser'` lines and the build will fail at Phase 3 (TS2300 duplicate identifier). It works today because the upstream fixture always uses `{ Page, Locator, expect }` and the existing regex flag the `@playwright/test` line first.
**Fix:** Replace the line-list approach with a single import-source filter — drop any existing line that imports from `'k6/browser'`, `'@lib/vendor/k6-testing-wrapper.js'`, or any specifier that ends in `/base-page` or `/selectors`. That makes the dedup symmetric with what `injectK6Imports` re-adds:
```js
const sources = /['"](?:k6\/browser|@lib\/vendor\/k6-testing-wrapper\.js|[^'"]*base-page|[^'"]*selectors)['"]/;
return content
  .split(/\r?\n/)
  .filter((line) => !(/^\s*import\s/.test(line) && sources.test(line)))
  .join('\n');
```

---

### WR-05: ensureExtendsK6Page rewrites the first class in the file, even if it is not the page object

**File:** `scripts/lib/transforms.mjs:131-144`
**Issue:** The transform anchors with `/m` and matches the first `class X {` it finds. Any leading helper class in an upstream POM file is silently turned into a `K6Page` subclass. Reproducer:

```ts
export class Utils { /* not a page */ }
export class HomePage extends BasePage { /* ... */ }
```
becomes:
```ts
export class Utils extends K6Page { /* now extends Page Object base */ }
export class HomePage extends K6Page { /* fine */ }
```

`Utils` now has a `constructor(page: Page)` requirement it never wanted, and the build breaks. Today the fixture has one class per file so this never fires. It is a known constraint upstream, but the converter does not enforce it: `convertFile` should detect "no `extends BasePage` and more than one class" and either skip the helper or refuse the file with a clear error.
**Fix:** Prefer the BasePage case (Case A) over the bare-class case (Case B). When Case A succeeds, do nothing else. When Case A fails, check whether the file contains any `class` that already extends something else — if so, leave the file untouched and emit a `console.warn` rather than re-anchoring K6Page onto the first class blindly.

## Info

### IN-01: `require` inside an ES module relies on Vite's CJS interop, not Node's

**File:** `lib/vendor/k6-testing-wrapper.js:3`
**Issue:** Line 3 uses bare `require('./k6-testing.js')`. The wrapper is consumed only via the Vite build (per `lib/vendor/README.md`), but the file extension is `.js` and there is no `package.json` `"type"` field nearby to scope it as CJS. Anyone who tries to `import` this wrapper directly under Node ESM will hit `ReferenceError: require is not defined`.
**Fix:** Add a brief header comment locking in the assumption ("Loaded only by Vite — do not import under Node ESM directly"). Optional: add `"type": "commonjs"` to a colocated `lib/vendor/package.json` if Vite tolerates it; otherwise leave the comment.

---

### IN-02: `scriptDir` is computed but never used in `convert-pages.mjs`

**File:** `scripts/convert-pages.mjs:46`
**Issue:** The comment on line 44 says it's tracked for diagnostics, and the `eslint-disable-next-line no-unused-vars` confirms it never gets read. Dead code that survives a hand-eye review is recruiter-visible noise.
**Fix:** Delete the assignment and the eslint comment. The `fileURLToPath` import can stay only if you actually need it later; if not, drop it too.

---

### IN-03: `void PATCH_DIR;` at line 225 is a no-op kept only to reference the constant

**File:** `scripts/convert-pages.mjs:225`
**Issue:** The comment explains the intent ("Reference PATCH_DIR for diagnostics"), but `void PATCH_DIR` is essentially a lint-silencer. Recruiters see a TypeScript-style expression statement that does nothing.
**Fix:** Either use `PATCH_DIR` in a real diagnostic (log the resolved path under a `--verbose` flag), or remove `PATCH_DIR` entirely and inline the path inside `convertFile`. Right now the constant is referenced once (line 132 builds `patchAbs` from `projectRoot` + a POSIX rel, not from `PATCH_DIR`).

---

### IN-04: `patchPathFor` does not normalize `..` segments in source paths

**File:** `scripts/lib/patch-injector.mjs:46-49`
**Issue:** `patchPathFor('../../etc/x.ts')` yields `lib/pages-k6-patches/../../etc/x.k6-patch.ts`. The converter then joins this with `projectRoot` and `existsSync` will check (and `readFile` will read) that resolved path. This is exploitable only if an attacker controls upstream filenames AND `sync-src.mjs`'s path-safety check (`assertSourceWithinSafeRoots`) is bypassed — both unlikely in a recruiter showcase — but a one-line guard removes the surface entirely.
**Fix:**
```js
export function patchPathFor(relPath) {
  const posixRel = relPath.split(path.sep).join('/');
  if (posixRel.includes('..')) {
    throw new Error(`Refusing patch path with .. segment: ${relPath}`);
  }
  return 'lib/pages-k6-patches/' + posixRel.replace(/\.ts$/, '.k6-patch.ts');
}
```

---

### IN-05: `ensureSuperPageCall` does not match multi-arg constructors

**File:** `scripts/lib/transforms.mjs:147-162`
**Issue:** The regex `constructor\s*\(\s*page\s*:\s*Page\s*\)\s*\{` only matches single-arg constructors. Upstream POMs that take additional injected services (`constructor(page: Page, logger: Logger)`) skip the `super(page);` insertion entirely, then crash at runtime with "Class constructor K6Page cannot be invoked without 'new'" or similar. Not a problem against today's fixture; the upstream constraint is implicit, not enforced.
**Fix:** Loosen the regex to accept additional parameters:
```js
/constructor\s*\(\s*page\s*:\s*Page\s*(?:,[^)]*)?\)\s*\{/
```
Add a unit test for the 2-arg shape.

---

### IN-06: `transformLocatorShortcuts` does global string replaces with no token-awareness

**File:** `scripts/lib/transforms.mjs:259-264`
**Issue:** The three `.replace(/\.first\(\)/g, '.nth(0)')`-style calls also rewrite text inside string literals and line comments. Examples:

Input: `// note: a.clear() resets the field`
Output: `// note: a.fill('') resets the field`

The output is still valid TypeScript and harmless for the upstream fixture, but it produces noisy diffs against the source-of-truth Playwright file. A recruiter reading the converted POM and comparing it to upstream will spot mysteriously-modified comments.
**Fix:** Cheap option — keep the transforms but add a `// converted: .first()→.nth(0) etc.` banner near the top of the generated file so the diff is explained. Real option — tokenize via a tiny ts-morph or babel-parser pass when Phase 3 lands a real TS toolchain. For now, document the known approximation in `PROJECT_STRUCTURE.md` so reviewers know the converter is "regex, not AST."

---

_Reviewed: 2026-05-11_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
