#!/usr/bin/env node

// scripts/convert-pages.mjs
// Real implementation for `npm run convert-pages`.
// Composes the pure helpers from scripts/lib/* into a Node-port of the
// ir-perf-k6/config/convert-to-k6.sh pipeline. Reads `src/pages/*.ts`
// (synced from upstream by `scripts/sync-src.mjs`), writes k6-safe POMs
// into `lib/pages/`, and concatenates any matching patch fragments from
// `lib/pages-k6-patches/`.
//
// Locked decisions: D-29..D-44 (see .planning/phases/02-upstream-sync-k6-adaptation/02-CONTEXT.md).
// Pipeline order locked in 02-PATTERNS.md §Pattern 3.

import { promises as fs, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Command } from 'commander';

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
} from './lib/transforms.mjs';

import { injectPatch, patchPathFor } from './lib/patch-injector.mjs';

// projectRoot is derived from process.cwd() so:
//   1) Real runs (`cd easyk6 && npm run convert-pages`) target the easyk6 repo.
//   2) Tests can drive the script with `cwd: <tmpRoot>` and the converter reads
//      and writes the tempdir's src/pages and lib/pages without polluting the
//      developer working tree.
// The script-location root is intentionally not consulted here — convert-pages
// has no upstream-source flag, so there is no path-traversal surface to gate.
const projectRoot = path.resolve(process.cwd());
// Track the script's own directory only for diagnostics; not used for routing.
// eslint-disable-next-line no-unused-vars
const scriptDir = path.dirname(fileURLToPath(import.meta.url));

const SOURCE_DIR = path.join(projectRoot, 'src', 'pages');
const TARGET_DIR = path.join(projectRoot, 'lib', 'pages');
const PATCH_DIR = path.join(projectRoot, 'lib', 'pages-k6-patches');

// SKIP_FILES: BasePage.ts is replaced functionally by hand-authored K6Page;
// index.ts is the upstream barrel that re-exports BasePage and would emit a
// broken module if converted. Hardcoded — no override flag (Pitfall 4 + 5).
const SKIP_FILES = new Set(['BasePage.ts', 'index.ts']);

function buildCli() {
  const program = new Command();
  program
    .name('easyk6-convert-pages')
    .description(
      'Convert synced Playwright Page Objects to k6-safe modules in lib/pages/.'
    );
  // No --source-dir / --target-dir flags (Pitfall 6: prevents double-conversion;
  // T-V12-01: hardcoded wipe target).
  program.exitOverride();
  return program;
}

function toPosix(p) {
  return p.split(path.sep).join('/');
}

function detectEol(content) {
  return content.includes('\r\n') ? '\r\n' : '\n';
}

async function collectTsFiles(dir) {
  const out = [];
  const entries = await fs.readdir(dir, {
    withFileTypes: true,
    recursive: true,
  });
  for (const e of entries) {
    if (e.isFile() && e.name.endsWith('.ts') && !e.name.endsWith('.d.ts')) {
      const parent = e.parentPath ?? dir;
      out.push(path.join(parent, e.name));
    }
  }
  return out;
}

// D-34: empty lib/pages/ on every run EXCEPT lib/pages/base/ (hand-authored).
// Plan 03-01 additions (RESEARCH §3.2(b) + §3.3):
//   - 'BasePage.ts'  — hand-authored re-export shim (defensive net for converter
//                      R6a strip-rule misses; see lib/pages/BasePage.ts).
//   - '.gitkeep'     — recruiter-visible sentinel that keeps lib/pages/ tracked
//                      across sync→convert cycles; wiping it produces
//                      'D lib/pages/.gitkeep' in git status every round-trip.
async function emptyLibPagesExceptBase() {
  await fs.mkdir(TARGET_DIR, { recursive: true });
  const entries = await fs.readdir(TARGET_DIR, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === 'base' || e.name === 'BasePage.ts' || e.name === '.gitkeep') continue;
    await fs.rm(path.join(TARGET_DIR, e.name), {
      recursive: true,
      force: true,
    });
  }
}

async function convertFile(srcPath, tgtPath, relPath) {
  let content = await fs.readFile(srcPath, 'utf8');
  const eol = detectEol(content);

  // Pipeline order locked in 02-PATTERNS.md §Pattern 3
  // R6a (Plan 03-01, RESEARCH §3.2(a)) sits between R2 duplicate-k6 strip and
  // R5 extends-rewrite — after stripDuplicateK6Imports so any prior-run
  // `{ BasePage }` line is gone first; before ensureExtendsK6Page so the
  // converter can still detect `extends BasePage` on the class line.
  content = stripPlaywrightImports(content);
  content = stripDuplicateK6Imports(content);
  content = stripLocalBasePageImports(content);
  content = ensureExtendsK6Page(content);
  content = ensureSuperPageCall(content);
  content = transformExpectAssertions(content);
  content = transformLocatorShortcuts(content);
  content = transformGetByMethods(content);
  content = stripPageFieldShadow(content);

  // R3 + R4 import injection (run AFTER expect transform so we know whether
  // any residual `// k6-compat: expect ...` lines remain — those need the
  // vendored expect import to type-check in Phase 3 if maintainers later
  // un-comment them).
  const k6ImportPath = computeK6ImportPath(relPath);
  const includeExpect = hasResidualExpectCompat(content);
  content = injectK6Imports(content, k6ImportPath, includeExpect);

  // Patch injection (D-39 / D-40 / D-43): if a matching patch file exists at
  // lib/pages-k6-patches/<rel>.k6-patch.ts, concatenate its content before the
  // last // #endregion (or the file's final closing brace as fallback).
  const patchRelPosix = patchPathFor(relPath);
  const patchAbs = path.join(projectRoot, patchRelPosix);
  const patchExists = existsSync(patchAbs);
  if (patchExists) {
    console.log(`  ↳ Injecting k6-specific methods from: ${patchRelPosix}`);
    const patchContent = await fs.readFile(patchAbs, 'utf8');
    content = injectPatch(content, patchContent);
  }

  // D-33 / R29 banner header
  const sourceRelPosix = toPosix(path.relative(projectRoot, srcPath));
  const bannerLines = [
    '// K6-compatible version - Auto-generated from Playwright Page Object',
    `// Source: ${sourceRelPosix}`,
  ];
  if (patchExists) {
    bannerLines.push(`// K6-PATCHES: Includes methods from ${patchRelPosix}`);
  }
  bannerLines.push('');
  const banner = bannerLines.join('\n');

  // Pitfall 2: normalize EOL back to source style on the way out.
  const final = (banner + '\n' + content).replace(/\r?\n/g, eol);

  await fs.mkdir(path.dirname(tgtPath), { recursive: true });
  await fs.writeFile(tgtPath, final, 'utf8');
}

async function preflight() {
  // Pitfall 10: src/pages/ must exist AND contain at least one .ts file.
  const exists = await fs
    .stat(SOURCE_DIR)
    .then((s) => s.isDirectory())
    .catch(() => false);
  if (!exists) {
    throw new Error('src/pages/ does not exist. Run `npm run sync:src` first.');
  }
  const entries = await fs.readdir(SOURCE_DIR, { recursive: true });
  const hasTs = entries.some(
    (name) => typeof name === 'string' && name.endsWith('.ts')
  );
  if (!hasTs) {
    throw new Error('src/pages/ is empty. Run `npm run sync:src` first.');
  }
}

async function main() {
  const cli = buildCli();
  try {
    cli.parse(process.argv);
  } catch (err) {
    if (
      err &&
      (err.code === 'commander.helpDisplayed' ||
        err.code === 'commander.help' ||
        err.code === 'commander.version')
    ) {
      return;
    }
    throw new Error(err.message || 'Failed to parse CLI arguments.');
  }

  await preflight();
  await emptyLibPagesExceptBase();

  // Collect every .ts file under src/pages/, then filter against SKIP_FILES.
  // Per checker warning #9: do NOT keep an unused intermediate `tsFiles` var.
  // The single `filtered` computation below is the only one consumed below.
  const files = await collectTsFiles(SOURCE_DIR);
  const filtered = files.filter((f) => {
    const rel = path.relative(SOURCE_DIR, f);
    return !SKIP_FILES.has(rel);
  });

  let errors = 0;
  for (let i = 0; i < filtered.length; i++) {
    const srcPath = filtered[i];
    const rel = path.relative(SOURCE_DIR, srcPath);
    const tgtPath = path.join(TARGET_DIR, rel);
    console.log(`[${i + 1}/${filtered.length}] Converting: ${toPosix(rel)}`);
    try {
      await convertFile(srcPath, tgtPath, rel);
      console.log('  ✓ Converted successfully');
    } catch (err) {
      // D-35: per-file errors do not abort the run; exit code is non-zero
      // overall so CI / scripted callers can detect partial failures.
      errors++;
      console.error(`  ✗ Error converting ${toPosix(rel)}: ${err.message}`);
    }
  }

  // Reference PATCH_DIR for diagnostics (it must exist on a real repo because
  // Plan 02-03 ships HomePage.k6-patch.ts; tests create it under tempdirs).
  // No assertion — convert-pages is tolerant of an empty patches folder.
  void PATCH_DIR;

  if (errors > 0) {
    console.error(`\n${errors} file(s) failed to convert.`);
    process.exit(1);
  }
  console.log(`\n✓ Converted ${filtered.length} file(s) into lib/pages/`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
