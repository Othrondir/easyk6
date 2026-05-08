// tests/integration/upst-03-roundtrip.test.mjs
// UPST-03 acceptance test (locked D-44).
//
// Per checker warning #6: this test invokes the REAL `scripts/sync-src.mjs`
// (NOT a manual fixture re-copy) so D-26 idempotent-sync behavior is exercised
// end-to-end together with `scripts/convert-pages.mjs`.
//
// Flow:
//   1. Set up a tempdir as a self-contained project root (scripts/ copied in,
//      hand-authored base + demo patch in place, NODE_PATH pointed at the
//      real repo's node_modules so commander resolves).
//   2. spawnSync the REAL sync-src against `tests/fixtures/upstream/`.
//   3. spawnSync the REAL convert-pages.
//   4. Capture the generated `lib/pages/HomePage.ts` content.
//   5. Re-run sync-src and convert-pages (full round-trip).
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

test('UPST-03 acceptance: sync→convert round-trip preserves the demo patch and is byte-deterministic', async (t) => {
  // Two full sync+convert cycles against the real fixture; allow more time
  // because each cycle copies the fixture tree and runs the orchestrator.
  // node:test does not honor a per-test timeout argument, but the test
  // harness default is 30s — we keep work bounded by using only the small
  // upstream fixture under tests/fixtures/upstream/.

  const tmp = await mkdtemp(path.join(tmpdir(), 'easyk6-upst03-'));
  try {
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
    const realPatch = path.join(
      projectRoot,
      'lib',
      'pages-k6-patches',
      'HomePage.k6-patch.ts'
    );
    await cp(
      realPatch,
      path.join(tmp, 'lib', 'pages-k6-patches', 'HomePage.k6-patch.ts')
    );

    // 4. Copy scripts/ (orchestrator + sync + helpers); reuse host node_modules
    // via NODE_PATH so commander resolves without copying ~100MB.
    await cp(path.join(projectRoot, 'scripts'), path.join(tmp, 'scripts'), {
      recursive: true,
    });
    await writeFile(
      path.join(tmp, 'package.json'),
      '{"name":"easyk6-upst03-fixture","type":"module"}',
      'utf8'
    );

    const env = {
      ...process.env,
      CI: '1',
      NODE_PATH: path.join(projectRoot, 'node_modules'),
    };

    // 5. First sync (real script invocation).
    const syncScript = path.join(tmp, 'scripts', 'sync-src.mjs');
    const convertScript = path.join(tmp, 'scripts', 'convert-pages.mjs');
    const sync1 = spawnSync(
      process.execPath,
      [syncScript, '--source', fixtureUpstream, '--yes'],
      { cwd: tmp, env, encoding: 'utf8' }
    );
    assert.equal(
      sync1.status,
      0,
      `first sync-src failed: ${sync1.stderr || sync1.stdout}`
    );

    // 6. First convert.
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

    // 7. Second sync — re-runs the REAL sync-src.mjs against the same upstream
    //    (this exercises D-26 idempotent-wipe + .sync-meta.json rewrite).
    const sync2 = spawnSync(
      process.execPath,
      [syncScript, '--source', fixtureUpstream, '--yes'],
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
  }
});
