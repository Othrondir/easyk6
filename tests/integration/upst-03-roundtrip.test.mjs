// tests/integration/upst-03-roundtrip.test.mjs
// UPST-03 acceptance test (locked D-44).
//
// Per checker warning #6: this test invokes the REAL `scripts/sync-src.mjs`
// (NOT a manual fixture re-copy) so D-26 idempotent-sync behavior is exercised
// end-to-end together with `scripts/convert-pages.mjs`.
//
// Strategy: spawn the REAL repo scripts (not copies) with `cwd: <tempdir>`.
//   - Both scripts derive projectRoot from `process.cwd()` so they read from
//     and write to the tempdir.
//   - sync-src.mjs's path-safety check (assertSourceWithinSafeRoots) ALSO
//     consults the script's own location, so the upstream fixture under
//     <repoRoot>/tests/fixtures/upstream remains reachable.
//   - This keeps node_modules, commander, and helper imports resolving from
//     the real repo without copying or symlinking anything.
//
// Flow:
//   1. Set up a tempdir as the project root: src/pages/, lib/pages/base/
//      (cp from real repo), lib/pages-k6-patches/HomePage.k6-patch.ts (cp).
//   2. spawnSync `scripts/sync-src.mjs` with --source=<repo>/tests/fixtures/upstream.
//   3. spawnSync `scripts/convert-pages.mjs`.
//   4. Capture the generated `lib/pages/HomePage.ts` content.
//   5. Re-run sync-src and convert-pages (full round-trip via REAL scripts).
//   6. Assert byte-identical output (deterministic) and the demo patch
//      method `measureNavigation` is still present (D-44 patch survives).

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

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..'
);
const fixtureUpstream = path.join(projectRoot, 'tests', 'fixtures', 'upstream');
const syncScript = path.join(projectRoot, 'scripts', 'sync-src.mjs');
const convertScript = path.join(projectRoot, 'scripts', 'convert-pages.mjs');

test('UPST-03 acceptance: sync→convert round-trip preserves the demo patch and is byte-deterministic', async () => {
  const tmp = await mkdtemp(path.join(tmpdir(), 'easyk6-upst03-'));
  // Build an ephemeral "fake upstream" sibling tempdir with the shape
  // sync-src.mjs expects: <upstream>/src/pages/*.ts. We populate src/pages/
  // from tests/fixtures/upstream/ (Plan 02-02's fixture corpus) so the real
  // sync-src wipe + cp pipeline runs against realistic Playwright POMs.
  // The sibling location keeps it inside the OS tmpdir tree, which is the
  // parent of `tmp` — so sync-src's path-safety check accepts it.
  const upstream = await mkdtemp(path.join(tmpdir(), 'easyk6-upst03-upstream-'));
  try {
    await mkdir(path.join(upstream, 'src', 'pages'), { recursive: true });
    await cp(fixtureUpstream, path.join(upstream, 'src', 'pages'), {
      recursive: true,
    });

    // 1. Project shape inside the tempdir.
    await mkdir(path.join(tmp, 'src', 'pages'), { recursive: true });
    await mkdir(path.join(tmp, 'lib', 'pages', 'base'), { recursive: true });
    await mkdir(path.join(tmp, 'lib', 'pages-k6-patches'), { recursive: true });

    // 2. Hand-authored base + selectors (preserved by convert-pages wipe).
    await cp(
      path.join(projectRoot, 'lib', 'pages', 'base'),
      path.join(tmp, 'lib', 'pages', 'base'),
      { recursive: true }
    );

    // 3. Demo HomePage patch (Task 2 of plan 02-03 ships this in the real repo).
    await cp(
      path.join(projectRoot, 'lib', 'pages-k6-patches', 'HomePage.k6-patch.ts'),
      path.join(tmp, 'lib', 'pages-k6-patches', 'HomePage.k6-patch.ts')
    );

    // 4. Minimal package.json marker so any project-shape probe in the scripts
    //    finds something there (no behavioral dependency, but a clean signal).
    await writeFile(
      path.join(tmp, 'package.json'),
      '{"name":"easyk6-upst03-fixture","type":"module"}',
      'utf8'
    );

    const env = { ...process.env, CI: '1' };

    // 5. First sync — REAL scripts/sync-src.mjs invoked via spawnSync.
    //    cwd: tmp drives the script's process.cwd()-based projectRoot.
    const sync1 = spawnSync(
      process.execPath,
      [syncScript, '--source', upstream, '--yes'],
      { cwd: tmp, env, encoding: 'utf8' }
    );
    assert.equal(
      sync1.status,
      0,
      `first sync-src failed: ${sync1.stderr || sync1.stdout}`
    );

    // 6. First convert — REAL scripts/convert-pages.mjs invoked via spawnSync.
    const conv1 = spawnSync(process.execPath, [convertScript], {
      cwd: tmp,
      env,
      encoding: 'utf8',
    });
    assert.equal(
      conv1.status,
      0,
      `first convert-pages failed: ${conv1.stderr || conv1.stdout}`
    );

    const firstOutput = await readFile(
      path.join(tmp, 'lib', 'pages', 'HomePage.ts'),
      'utf8'
    );
    assert.match(
      firstOutput,
      /measureNavigation/,
      'demo patch method must appear in generated HomePage.ts after first convert'
    );
    assert.match(
      firstOutput,
      /extends K6Page/,
      'generated HomePage.ts must extend K6Page'
    );
    // Convert-pages must log the patch-injection line per D-43.
    assert.match(
      conv1.stdout,
      /Injecting k6-specific methods from: lib[\\/]+pages-k6-patches[\\/]+HomePage\.k6-patch\.ts/,
      `convert-pages must log the patch injection line, got: ${conv1.stdout}`
    );

    // 7. Second sync — re-runs the REAL sync-src.mjs against the same upstream.
    //    Exercises D-26 idempotent-wipe + .sync-meta.json rewrite end-to-end.
    const sync2 = spawnSync(
      process.execPath,
      [syncScript, '--source', upstream, '--yes'],
      { cwd: tmp, env, encoding: 'utf8' }
    );
    assert.equal(
      sync2.status,
      0,
      `second sync-src failed: ${sync2.stderr || sync2.stdout}`
    );

    // 8. Second convert.
    const conv2 = spawnSync(process.execPath, [convertScript], {
      cwd: tmp,
      env,
      encoding: 'utf8',
    });
    assert.equal(
      conv2.status,
      0,
      `second convert-pages failed: ${conv2.stderr || conv2.stdout}`
    );

    const secondOutput = await readFile(
      path.join(tmp, 'lib', 'pages', 'HomePage.ts'),
      'utf8'
    );
    assert.match(
      secondOutput,
      /measureNavigation/,
      'demo patch method must SURVIVE the round-trip (UPST-03 D-44)'
    );

    // 9. Determinism: byte-identical across both runs.
    assert.equal(
      firstOutput,
      secondOutput,
      'sync→convert round-trip must produce byte-identical lib/pages/HomePage.ts on re-run'
    );
  } finally {
    await rm(tmp, { force: true, recursive: true });
    await rm(upstream, { force: true, recursive: true });
  }
});
