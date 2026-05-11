// tests/unit/convert-pages.test.mjs
// Wave 0 file-orchestration coverage for `scripts/convert-pages.mjs`.
//
// Each test sets up a tempdir as the project root (with `src/pages/` populated
// from `tests/fixtures/upstream/`, the real `lib/pages/base/` files copied in,
// and an empty `lib/pages-k6-patches/`), then drives the real converter via
// `spawnSync`. The tempdir cwd is the trick that lets the converter's
// `process.cwd()`-based projectRoot resolution write into ephemeral
// directories instead of polluting the developer working tree.

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
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

async function makeTempProject() {
  const tmp = await mkdtemp(path.join(tmpdir(), 'easyk6-convert-test-'));
  await mkdir(path.join(tmp, 'src', 'pages'), { recursive: true });
  await mkdir(path.join(tmp, 'lib', 'pages', 'base'), { recursive: true });
  await mkdir(path.join(tmp, 'lib', 'pages-k6-patches'), { recursive: true });
  await cp(realBasePage, path.join(tmp, 'lib', 'pages', 'base', 'base-page.ts'));
  await cp(realSelectors, path.join(tmp, 'lib', 'pages', 'base', 'selectors.ts'));
  await writeFile(
    path.join(tmp, 'package.json'),
    '{"name":"easyk6-convert-test-fixture","type":"module"}',
    'utf8'
  );
  return tmp;
}

function runConvert(cwd) {
  return spawnSync(process.execPath, [convertScript], {
    cwd,
    env: { ...process.env, CI: '1' },
    encoding: 'utf8',
  });
}

async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

test('converts a single POM and writes lib/pages/HomePage.ts with the locked banner', async () => {
  const tmp = await makeTempProject();
  try {
    await cp(
      path.join(fixtureUpstream, 'BasePage.ts'),
      path.join(tmp, 'src', 'pages', 'BasePage.ts')
    );
    await cp(
      path.join(fixtureUpstream, 'HomePage.ts'),
      path.join(tmp, 'src', 'pages', 'HomePage.ts')
    );

    const result = runConvert(tmp);
    assert.equal(result.status, 0, result.stderr || result.stdout);

    const home = await readFile(
      path.join(tmp, 'lib', 'pages', 'HomePage.ts'),
      'utf8'
    );
    const firstLine = home.split(/\r?\n/)[0];
    assert.equal(
      firstLine,
      '// K6-compatible version - Auto-generated from Playwright Page Object',
      'first line must be the locked banner'
    );
  } finally {
    await rm(tmp, { force: true, recursive: true });
  }
});

test('skips BasePage.ts (R6 / Pitfall 4)', async () => {
  const tmp = await makeTempProject();
  try {
    await cp(
      path.join(fixtureUpstream, 'BasePage.ts'),
      path.join(tmp, 'src', 'pages', 'BasePage.ts')
    );
    await cp(
      path.join(fixtureUpstream, 'HomePage.ts'),
      path.join(tmp, 'src', 'pages', 'HomePage.ts')
    );

    const result = runConvert(tmp);
    assert.equal(result.status, 0, result.stderr || result.stdout);

    const baseGenerated = await exists(
      path.join(tmp, 'lib', 'pages', 'BasePage.ts')
    );
    assert.equal(baseGenerated, false, 'lib/pages/BasePage.ts must not exist');

    const homeGenerated = await exists(
      path.join(tmp, 'lib', 'pages', 'HomePage.ts')
    );
    assert.equal(homeGenerated, true, 'lib/pages/HomePage.ts must exist');
  } finally {
    await rm(tmp, { force: true, recursive: true });
  }
});

test('skips index.ts (Pitfall 5)', async () => {
  const tmp = await makeTempProject();
  try {
    await cp(
      path.join(fixtureUpstream, 'BasePage.ts'),
      path.join(tmp, 'src', 'pages', 'BasePage.ts')
    );
    await cp(
      path.join(fixtureUpstream, 'HomePage.ts'),
      path.join(tmp, 'src', 'pages', 'HomePage.ts')
    );
    await cp(
      path.join(fixtureUpstream, 'index.ts'),
      path.join(tmp, 'src', 'pages', 'index.ts')
    );

    const result = runConvert(tmp);
    assert.equal(result.status, 0, result.stderr || result.stdout);

    const indexGenerated = await exists(
      path.join(tmp, 'lib', 'pages', 'index.ts')
    );
    assert.equal(indexGenerated, false, 'lib/pages/index.ts must not exist');
  } finally {
    await rm(tmp, { force: true, recursive: true });
  }
});

test('preserves lib/pages/base/ during wipe', async () => {
  const tmp = await makeTempProject();
  try {
    const sentinelPath = path.join(
      tmp,
      'lib',
      'pages',
      'base',
      'sentinel.ts'
    );
    await writeFile(sentinelPath, '// preserved by convert-pages\n', 'utf8');

    await cp(
      path.join(fixtureUpstream, 'BasePage.ts'),
      path.join(tmp, 'src', 'pages', 'BasePage.ts')
    );
    await cp(
      path.join(fixtureUpstream, 'HomePage.ts'),
      path.join(tmp, 'src', 'pages', 'HomePage.ts')
    );

    const result = runConvert(tmp);
    assert.equal(result.status, 0, result.stderr || result.stdout);

    const sentinelStill = await exists(sentinelPath);
    assert.equal(
      sentinelStill,
      true,
      'lib/pages/base/sentinel.ts must survive convert-pages'
    );

    // base-page.ts still present too
    const basePresent = await exists(
      path.join(tmp, 'lib', 'pages', 'base', 'base-page.ts')
    );
    assert.equal(basePresent, true, 'lib/pages/base/base-page.ts preserved');
  } finally {
    await rm(tmp, { force: true, recursive: true });
  }
});

test('preserves lib/pages/BasePage.ts re-export shim during wipe (RESEARCH §3.2(b))', async () => {
  const tmp = await makeTempProject();
  try {
    const basePageShimPath = path.join(tmp, 'lib', 'pages', 'BasePage.ts');
    await writeFile(
      basePageShimPath,
      "export { K6Page as BasePage } from './base/base-page';\n",
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

    const result = runConvert(tmp);
    assert.equal(result.status, 0, result.stderr || result.stdout);

    const shimStill = await exists(basePageShimPath);
    assert.equal(
      shimStill,
      true,
      'lib/pages/BasePage.ts re-export shim must survive convert-pages wipe'
    );
  } finally {
    await rm(tmp, { force: true, recursive: true });
  }
});

test('preserves lib/pages/.gitkeep during wipe (RESEARCH §3.3)', async () => {
  const tmp = await makeTempProject();
  try {
    const gitkeepPath = path.join(tmp, 'lib', 'pages', '.gitkeep');
    await writeFile(gitkeepPath, '', 'utf8');

    await cp(
      path.join(fixtureUpstream, 'BasePage.ts'),
      path.join(tmp, 'src', 'pages', 'BasePage.ts')
    );
    await cp(
      path.join(fixtureUpstream, 'HomePage.ts'),
      path.join(tmp, 'src', 'pages', 'HomePage.ts')
    );

    const result = runConvert(tmp);
    assert.equal(result.status, 0, result.stderr || result.stdout);

    const gitkeepStill = await exists(gitkeepPath);
    assert.equal(
      gitkeepStill,
      true,
      'lib/pages/.gitkeep must survive convert-pages wipe'
    );
  } finally {
    await rm(tmp, { force: true, recursive: true });
  }
});

test('converted POMs do NOT carry the dangling `import { BasePage } from \'./BasePage\';` line (R6a strip)', async () => {
  const tmp = await makeTempProject();
  try {
    await cp(
      path.join(fixtureUpstream, 'BasePage.ts'),
      path.join(tmp, 'src', 'pages', 'BasePage.ts')
    );
    await cp(
      path.join(fixtureUpstream, 'HomePage.ts'),
      path.join(tmp, 'src', 'pages', 'HomePage.ts')
    );

    const result = runConvert(tmp);
    assert.equal(result.status, 0, result.stderr || result.stdout);

    const home = await readFile(
      path.join(tmp, 'lib', 'pages', 'HomePage.ts'),
      'utf8'
    );
    assert.doesNotMatch(
      home,
      /^\s*import\s+\{\s*BasePage\s*\}\s+from\s+['"]\.\/?BasePage['"]/m,
      'generated HomePage.ts must NOT carry the dangling BasePage import'
    );
    assert.match(
      home,
      /extends K6Page/,
      'generated HomePage.ts must still extend K6Page after the strip'
    );
  } finally {
    await rm(tmp, { force: true, recursive: true });
  }
});

test('exits non-zero when src/pages/ has no .ts files (Pitfall 10)', async () => {
  const tmp = await makeTempProject();
  try {
    // src/pages/ exists but is empty (no .ts files)
    const result = runConvert(tmp);
    assert.notEqual(
      result.status,
      0,
      'must exit non-zero when src/pages/ is empty'
    );
    assert.match(
      result.stderr,
      /run.*sync:src first|src[\\/]+pages.*empty/i,
      `stderr should explain empty src/pages, got: ${result.stderr}`
    );
  } finally {
    await rm(tmp, { force: true, recursive: true });
  }
});

test('per-file conversion error does not abort run; exit code is non-zero', async () => {
  const tmp = await makeTempProject();
  try {
    // Forcing function: ship a valid POM (BadPage) and a MATCHING patch entry
    // at `lib/pages-k6-patches/BadPage.k6-patch.ts`, but author the patch
    // entry as a DIRECTORY rather than a file. existsSync returns true for
    // directories, so the converter takes the "patch exists" branch and calls
    // fs.readFile(patchAbs) — which throws EISDIR. That throw is what the
    // per-file try/catch must catch (D-35): the BadPage emit fails, the error
    // is logged, the OTHER POM (HomePage) is still written, and the run exits
    // non-zero overall. This exercises the real error path without depending
    // on transform internals.
    await cp(
      path.join(fixtureUpstream, 'HomePage.ts'),
      path.join(tmp, 'src', 'pages', 'HomePage.ts')
    );
    await cp(
      path.join(fixtureUpstream, 'HomePage.ts'),
      path.join(tmp, 'src', 'pages', 'BadPage.ts')
    );
    await mkdir(path.join(tmp, 'lib', 'pages-k6-patches', 'BadPage.k6-patch.ts'), {
      recursive: true,
    });

    const result = runConvert(tmp);
    assert.notEqual(
      result.status,
      0,
      `convert-pages must exit non-zero when at least one file fails (got ${result.status}): ${result.stderr}`
    );
    assert.match(
      result.stderr,
      /Error converting BadPage\.ts/,
      `stderr should report the per-file error, got: ${result.stderr}`
    );
    // The other POM (HomePage) must still be written even though BadPage failed.
    const homeWritten = await exists(
      path.join(tmp, 'lib', 'pages', 'HomePage.ts')
    );
    assert.equal(
      homeWritten,
      true,
      'HomePage.ts must still be emitted even when BadPage.ts conversion fails'
    );
  } finally {
    await rm(tmp, { force: true, recursive: true });
  }
});
