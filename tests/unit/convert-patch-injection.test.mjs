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
  // Patch lands above the // #endregion line (a blank-line separator is OK
  // and matches the ir-perf reference implementation that always emits an
  // extra '\n' after patchContent for readability).
  assert.match(out, /  b\(\) \{\}\n\s*\/\/ #endregion\n/);
  // Original `a()` body must remain intact and must be ABOVE the patch.
  assert.match(out, /  a\(\) \{\}/);
  const aIdx = out.indexOf('a() {}');
  const bIdx = out.indexOf('b() {}');
  const endIdx = out.indexOf('// #endregion');
  assert.ok(
    aIdx >= 0 && bIdx > aIdx && endIdx > bIdx,
    'order must be a() then b() then // #endregion'
  );
});

test('easyk6 fallback: no #endregion, injects before last `}`', () => {
  const src = 'export class HomePage {\n  a() {}\n}\n';
  const patch = '  b() {}\n';
  const out = injectPatch(src, patch);
  // The patched method must appear before the closing `}` of the class.
  // A trailing blank line between the patch and `}` is acceptable — it
  // matches the ir-perf reference patcher's emit-an-extra-'\n' behavior.
  assert.match(out, /  b\(\) \{\}\n\s*\}/);
  // No #endregion was introduced.
  assert.doesNotMatch(out, /\/\/ #endregion/);
  const bIdx = out.indexOf('b() {}');
  const closeIdx = out.lastIndexOf('}');
  assert.ok(bIdx > 0 && bIdx < closeIdx, 'patch must appear before last }');
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
