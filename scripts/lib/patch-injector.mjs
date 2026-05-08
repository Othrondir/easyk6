// scripts/lib/patch-injector.mjs
// Patch injection for the k6 page-object converter.
// Source: convert-to-k6.sh:751-787 (Python original) — easyk6 fallback adaptation.

import path from 'node:path';

/**
 * Insert `patchContent` into the generated POM. Locked algorithm:
 *  1. PRIMARY: insert before the line containing the LAST `// #endregion`.
 *  2. EASYK6 FALLBACK: insert before the file's last `}` (final closing brace).
 *
 * The `export default` middle step from ir-perf is dropped because
 * easyPlaywright POMs use named-class exports.
 */
export function injectPatch(content, patchContent) {
  const lastEndregion = content.lastIndexOf('// #endregion');
  if (lastEndregion !== -1) {
    let lineStart = content.lastIndexOf('\n', lastEndregion);
    lineStart = lineStart === -1 ? 0 : lineStart + 1;
    return (
      content.slice(0, lineStart) +
      patchContent +
      '\n' +
      content.slice(lineStart)
    );
  }
  const lastBrace = content.lastIndexOf('}');
  if (lastBrace !== -1) {
    return (
      content.slice(0, lastBrace) +
      patchContent +
      '\n' +
      content.slice(lastBrace)
    );
  }
  throw new Error('Cannot locate injection point in generated POM.');
}

/**
 * Compute the patch path that mirrors the source folder hierarchy.
 * Always emits POSIX-style separators.
 *
 *   HomePage.ts            -> lib/pages-k6-patches/HomePage.k6-patch.ts
 *   components/Nav.ts      -> lib/pages-k6-patches/components/Nav.k6-patch.ts
 */
export function patchPathFor(relPath) {
  const posixRel = relPath.split(path.sep).join('/');
  return 'lib/pages-k6-patches/' + posixRel.replace(/\.ts$/, '.k6-patch.ts');
}
