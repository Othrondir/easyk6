import test from 'node:test';
import assert from 'node:assert/strict';

import {
  injectPatch,
  patchPathFor,
} from '../../scripts/lib/patch-injector.mjs';

test('primary path: injects before LAST // #endregion', () => {
  const src = 'class X {\n  a() {}\n  // #endregion\n}\n';
  const patch = '  b() {}\n';
  const out = injectPatch(src, patch);
  assert.match(out, /  b\(\) \{\}\n  \/\/ #endregion\n/);
  // Original `a()` body must remain intact.
  assert.match(out, /  a\(\) \{\}/);
});

test('easyk6 fallback: no #endregion, injects before last `}`', () => {
  const src = 'export class HomePage {\n  a() {}\n}\n';
  const patch = '  b() {}\n';
  const out = injectPatch(src, patch);
  // The patched method must appear immediately before the closing `}` of the class.
  assert.match(out, /  b\(\) \{\}\n\}/);
  // No #endregion was introduced.
  assert.doesNotMatch(out, /\/\/ #endregion/);
});

test('throws when no closing brace exists', () => {
  assert.throws(
    () => injectPatch('// no class', '  b() {}\n'),
    /Cannot locate injection point/
  );
});

test('patchPathFor: HomePage.ts → lib/pages-k6-patches/HomePage.k6-patch.ts', () => {
  assert.equal(
    patchPathFor('HomePage.ts'),
    'lib/pages-k6-patches/HomePage.k6-patch.ts'
  );
});

test('patchPathFor: components/Nav.ts → lib/pages-k6-patches/components/Nav.k6-patch.ts (POSIX separators)', () => {
  // Mirror nested source hierarchy with POSIX-style separators on every platform.
  assert.equal(
    patchPathFor('components/Nav.ts'),
    'lib/pages-k6-patches/components/Nav.k6-patch.ts'
  );
});
