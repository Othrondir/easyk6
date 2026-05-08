// tests/unit/convert-roundtrip.test.mjs
// Wave 0 syntax-validity check for converter output.
//
// Spawns `scripts/convert-pages.mjs` against a tempdir project root populated
// from `tests/fixtures/upstream/`, then reads the generated `lib/pages/HomePage.ts`
// and runs it through `ts.transpileModule` (syntax-only). Module resolution is
// deliberately NOT exercised here — Phase 3 owns the `tsc --noEmit` gate (see
// RESEARCH Open Question 5 RESOLVED). This test only proves the converter does
// not emit broken TypeScript syntax.

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..'
);
const convertScript = path.join(projectRoot, 'scripts', 'convert-pages.mjs');
const fixtureUpstream = path.join(projectRoot, 'tests', 'fixtures', 'upstream');
const realBasePage = path.join(
  projectRoot,
  'lib',
  'pages',
  'base',
  'base-page.ts'
);
const realSelectors = path.join(
  projectRoot,
  'lib',
  'pages',
  'base',
  'selectors.ts'
);

test('generated lib/pages/HomePage.ts is syntactically valid TypeScript', async () => {
  const tmp = await mkdtemp(path.join(tmpdir(), 'easyk6-roundtrip-'));
  try {
    await mkdir(path.join(tmp, 'src', 'pages'), { recursive: true });
    await mkdir(path.join(tmp, 'lib', 'pages', 'base'), { recursive: true });
    await mkdir(path.join(tmp, 'lib', 'pages-k6-patches'), { recursive: true });
    await cp(realBasePage, path.join(tmp, 'lib', 'pages', 'base', 'base-page.ts'));
    await cp(realSelectors, path.join(tmp, 'lib', 'pages', 'base', 'selectors.ts'));
    await writeFile(
      path.join(tmp, 'package.json'),
      '{"name":"easyk6-roundtrip-fixture","type":"module"}',
      'utf8'
    );
    await cp(
      path.join(fixtureUpstream, 'BasePage.ts'),
      path.join(tmp, 'src', 'pages', 'BasePage.ts')
    );
    await cp(
      path.join(fixtureUpstream, 'HomePage.ts'),
      path.join(tmp, 'src', 'pages', 'HomePage.ts')
    );

    const result = spawnSync(process.execPath, [convertScript], {
      cwd: tmp,
      env: { ...process.env, CI: '1' },
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);

    const generated = await readFile(
      path.join(tmp, 'lib', 'pages', 'HomePage.ts'),
      'utf8'
    );

    // Parse as TS source and assert there are no syntactic errors.
    const sourceFile = ts.createSourceFile(
      'HomePage.ts',
      generated,
      ts.ScriptTarget.ES2020,
      /* setParentNodes */ true,
      ts.ScriptKind.TS
    );

    // ts.createSourceFile records syntactic diagnostics on the source file
    // node. Empty array means clean syntax.
    const syntactic = sourceFile.parseDiagnostics ?? [];
    assert.equal(
      syntactic.length,
      0,
      `Generated HomePage.ts has syntactic errors: ${syntactic
        .map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'))
        .join('\n')}`
    );

    // Defensive: also try transpileModule, which surfaces additional issues
    // through diagnostics it produces.
    const out = ts.transpileModule(generated, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2020,
      },
      reportDiagnostics: true,
    });
    const transpileDiags = out.diagnostics ?? [];
    assert.equal(
      transpileDiags.length,
      0,
      `transpileModule reported diagnostics: ${transpileDiags
        .map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'))
        .join('\n')}`
    );

    // Sanity: extends K6Page must appear; banner must be on line 1.
    assert.match(generated, /extends K6Page/);
    assert.match(
      generated.split(/\r?\n/)[0],
      /^\/\/ K6-compatible version - Auto-generated from Playwright Page Object$/
    );
  } finally {
    await rm(tmp, { force: true, recursive: true });
  }
});
