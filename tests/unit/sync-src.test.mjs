import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, rm, readFile, writeFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..'
);
const syncScript = path.join(projectRoot, 'scripts', 'sync-src.mjs');
const fixtureUpstream = path.join(
  projectRoot,
  'tests',
  'fixtures',
  'upstream-fake'
);

function runSync(args, env = {}, cwd = projectRoot) {
  // Build a clean env: callers can pass `CI: ''` to clear, otherwise inherit + merge.
  const baseEnv = { ...process.env };
  // Avoid inheriting EASYPLAYWRIGHT_SRC from the developer shell — tests must drive it explicitly.
  delete baseEnv.EASYPLAYWRIGHT_SRC;
  const finalEnv = { ...baseEnv, ...env };
  return spawnSync(process.execPath, [syncScript, ...args], {
    cwd,
    env: finalEnv,
    encoding: 'utf8',
  });
}

async function makeProjectRoot() {
  // Tempdir mimicking easyk6 root (only needs `src/pages/` so the script's
  // process.cwd()-based projectRoot resolution writes here instead of the real repo).
  const tmp = await mkdtemp(path.join(tmpdir(), 'easyk6-sync-test-'));
  await mkdir(path.join(tmp, 'src', 'pages'), { recursive: true });
  await writeFile(path.join(tmp, 'src', 'pages', '.gitkeep'), '', 'utf8');
  // A minimal package.json marker so anything checking for project shape can find it.
  await writeFile(
    path.join(tmp, 'package.json'),
    JSON.stringify({ name: 'easyk6-sync-test-fixture', private: true }),
    'utf8'
  );
  return tmp;
}

test('sync-src local mode copies upstream src/pages and writes .sync-meta.json', async () => {
  const tmpRoot = await makeProjectRoot();
  try {
    const result = runSync(['--source', fixtureUpstream, '--yes'], { CI: '1' }, tmpRoot);
    assert.equal(result.status, 0, result.stderr || result.stdout);

    const homePath = path.join(tmpRoot, 'src', 'pages', 'HomePage.ts');
    const homeStat = await stat(homePath);
    assert.ok(homeStat.isFile(), 'HomePage.ts should exist after sync');

    const metaRaw = await readFile(
      path.join(tmpRoot, 'src', 'pages', '.sync-meta.json'),
      'utf8'
    );
    const meta = JSON.parse(metaRaw);
    assert.equal(meta.mode, 'local');
    assert.equal(typeof meta.source, 'string');
    assert.ok(meta.source.length > 0);
    assert.ok(Date.parse(meta.syncedAt) > 0, 'syncedAt should be parseable');
    assert.equal(meta.branch, undefined, 'branch must not be set in local mode');
    assert.equal(meta.commit, undefined, 'commit must not be set in local mode');
  } finally {
    await rm(tmpRoot, { force: true, recursive: true });
  }
});

test('sync-src local mode preserves src/pages/.gitkeep across sync (RESEARCH §3.3)', async () => {
  const tmpRoot = await makeProjectRoot();
  try {
    // makeProjectRoot() already writes src/pages/.gitkeep — see line 40 above.
    const gitkeepPath = path.join(tmpRoot, 'src', 'pages', '.gitkeep');
    const beforeStat = await stat(gitkeepPath);
    assert.ok(beforeStat.isFile(), 'sanity: .gitkeep exists before sync');

    const result = runSync(['--source', fixtureUpstream, '--yes'], { CI: '1' }, tmpRoot);
    assert.equal(result.status, 0, result.stderr || result.stdout);

    let stillThere = true;
    try {
      const afterStat = await stat(gitkeepPath);
      stillThere = afterStat.isFile();
    } catch {
      stillThere = false;
    }
    assert.equal(
      stillThere,
      true,
      '.gitkeep at src/pages/.gitkeep must survive sync wipe'
    );

    // And the sync still copied real content alongside it.
    const homeStat = await stat(path.join(tmpRoot, 'src', 'pages', 'HomePage.ts'));
    assert.ok(homeStat.isFile(), 'HomePage.ts must still be present alongside .gitkeep');
  } finally {
    await rm(tmpRoot, { force: true, recursive: true });
  }
});

test('sync-src refuses --source path that escapes project root sibling tree (T-V5-01)', async () => {
  const tmpRoot = await makeProjectRoot();
  try {
    const escaping = process.platform === 'win32' ? 'C:\\Windows' : '/etc';
    const result = runSync(['--source', escaping, '--yes'], { CI: '1' }, tmpRoot);
    assert.notEqual(result.status, 0, 'must exit non-zero for path traversal');
    assert.match(
      result.stderr,
      /outside the project root|path traversal|not allowed/i,
      `stderr should explain refusal, got: ${result.stderr}`
    );
  } finally {
    await rm(tmpRoot, { force: true, recursive: true });
  }
});

test('sync-src rejects --source and --repo together', async () => {
  const tmpRoot = await makeProjectRoot();
  try {
    const result = runSync(
      ['--source', fixtureUpstream, '--repo', 'https://example.com/foo.git', '--yes'],
      { CI: '1' },
      tmpRoot
    );
    assert.notEqual(result.status, 0, 'must exit non-zero on mutually exclusive flags');
    assert.match(
      result.stderr,
      /mutually exclusive/i,
      `stderr should explain mutual exclusion, got: ${result.stderr}`
    );
  } finally {
    await rm(tmpRoot, { force: true, recursive: true });
  }
});

test('sync-src skips prompt when CI=1 (D-28)', async () => {
  const tmpRoot = await makeProjectRoot();
  try {
    const result = runSync(['--source', fixtureUpstream], { CI: '1' }, tmpRoot);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.doesNotMatch(
      result.stdout,
      /Continue\? \[y\/N\]/,
      'CI=1 must skip the confirmation prompt'
    );
  } finally {
    await rm(tmpRoot, { force: true, recursive: true });
  }
});

test('sync-src skips prompt when --yes is provided', async () => {
  const tmpRoot = await makeProjectRoot();
  try {
    const result = runSync(['--source', fixtureUpstream, '--yes'], { CI: '0' }, tmpRoot);
    assert.equal(result.status, 0, result.stderr || result.stdout);
  } finally {
    await rm(tmpRoot, { force: true, recursive: true });
  }
});

test('sync-src fails fast when upstream src/pages does not exist', async () => {
  const tmpRoot = await makeProjectRoot();
  const badUpstream = await mkdtemp(path.join(tmpdir(), 'easyk6-sync-bad-upstream-'));
  try {
    const result = runSync(['--source', badUpstream, '--yes'], { CI: '1' }, tmpRoot);
    assert.notEqual(result.status, 0, 'must exit non-zero when upstream src/pages is missing');
    assert.match(
      result.stderr,
      /src[\\/]+pages.*not found|Expected.*src[\\/]+pages/i,
      `stderr should explain missing src/pages, got: ${result.stderr}`
    );
  } finally {
    await rm(tmpRoot, { force: true, recursive: true });
    await rm(badUpstream, { force: true, recursive: true });
  }
});

test('sync-src is idempotent: stale upstream files are removed on re-sync', async () => {
  const tmpRoot = await makeProjectRoot();
  try {
    const first = runSync(['--source', fixtureUpstream, '--yes'], { CI: '1' }, tmpRoot);
    assert.equal(first.status, 0, first.stderr || first.stdout);

    const stalePath = path.join(tmpRoot, 'src', 'pages', 'StaleFile.ts');
    await writeFile(stalePath, 'stale', 'utf8');

    const second = runSync(['--source', fixtureUpstream, '--yes'], { CI: '1' }, tmpRoot);
    assert.equal(second.status, 0, second.stderr || second.stdout);

    let staleStillThere = true;
    try {
      await stat(stalePath);
    } catch {
      staleStillThere = false;
    }
    assert.equal(staleStillThere, false, 'stale file must be wiped on re-sync');

    const homeStat = await stat(path.join(tmpRoot, 'src', 'pages', 'HomePage.ts'));
    assert.ok(homeStat.isFile(), 'fresh HomePage.ts must still be present after re-sync');
  } finally {
    await rm(tmpRoot, { force: true, recursive: true });
  }
});

test('sync-src exits non-zero when neither --source nor --repo nor EASYPLAYWRIGHT_SRC nor sibling ../easyPlaywright is reachable', async () => {
  const tmpRoot = await makeProjectRoot();
  try {
    // tmpRoot has no sibling `easyPlaywright` directory; clear the env explicitly.
    const result = runSync([], { CI: '1', EASYPLAYWRIGHT_SRC: '' }, tmpRoot);
    assert.notEqual(result.status, 0, 'must exit non-zero when no upstream source is reachable');
    assert.match(
      result.stderr,
      /easyPlaywright|upstream/i,
      `stderr should mention easyPlaywright/upstream, got: ${result.stderr}`
    );
  } finally {
    await rm(tmpRoot, { force: true, recursive: true });
  }
});

test('sync-src git mode clones a local bare repo and captures commit SHA + branch in .sync-meta.json (closes checker blocker #3)', async (t) => {
  const gitCheck = spawnSync('git', ['--version'], { encoding: 'utf8' });
  if (gitCheck.status !== 0) {
    t.skip('git unavailable on this host');
    return;
  }

  const tmpRoot = await makeProjectRoot();
  const upstreamBare = await mkdtemp(path.join(tmpdir(), 'easyk6-sync-test-bare-'));
  const work = await mkdtemp(path.join(tmpdir(), 'easyk6-sync-test-work-'));

  try {
    const initBare = spawnSync('git', ['init', '--bare', upstreamBare], { encoding: 'utf8' });
    assert.equal(initBare.status, 0, `git init --bare failed: ${initBare.stderr}`);

    await mkdir(path.join(work, 'src', 'pages'), { recursive: true });
    await writeFile(
      path.join(work, 'src', 'pages', 'HomePage.ts'),
      `import { Page } from '@playwright/test';\nexport class HomePage {}\n`,
      'utf8'
    );

    spawnSync('git', ['-C', work, 'init', '-b', 'main'], { encoding: 'utf8' });
    spawnSync('git', ['-C', work, 'config', 'user.email', 't@t'], { encoding: 'utf8' });
    spawnSync('git', ['-C', work, 'config', 'user.name', 'T'], { encoding: 'utf8' });
    spawnSync('git', ['-C', work, 'config', 'commit.gpgsign', 'false'], { encoding: 'utf8' });
    spawnSync('git', ['-C', work, 'add', '-A'], { encoding: 'utf8' });
    const commitRes = spawnSync('git', ['-C', work, 'commit', '-m', 'initial'], {
      encoding: 'utf8',
    });
    assert.equal(commitRes.status, 0, `git commit failed: ${commitRes.stderr}`);

    spawnSync('git', ['-C', work, 'remote', 'add', 'origin', upstreamBare], {
      encoding: 'utf8',
    });
    const pushRes = spawnSync('git', ['-C', work, 'push', 'origin', 'main'], {
      encoding: 'utf8',
    });
    assert.equal(pushRes.status, 0, `git push failed: ${pushRes.stderr}`);

    // Build a file:// URL the script can clone from cross-platform.
    const repoUrl =
      'file://' +
      (process.platform === 'win32'
        ? '/' + upstreamBare.replace(/\\/g, '/')
        : upstreamBare);

    const result = runSync(
      ['--repo', repoUrl, '--branch', 'main', '--yes'],
      { CI: '1' },
      tmpRoot
    );
    assert.equal(result.status, 0, result.stderr || result.stdout);

    const homeStat = await stat(path.join(tmpRoot, 'src', 'pages', 'HomePage.ts'));
    assert.ok(homeStat.isFile(), 'HomePage.ts should exist after git-mode sync');

    const metaRaw = await readFile(
      path.join(tmpRoot, 'src', 'pages', '.sync-meta.json'),
      'utf8'
    );
    const meta = JSON.parse(metaRaw);
    assert.equal(meta.mode, 'git');
    assert.equal(meta.branch, 'main');
    assert.match(meta.commit, /^[a-f0-9]{40}$/, 'commit must be a full 40-char SHA');
    assert.equal(meta.source, repoUrl);
  } finally {
    await rm(tmpRoot, { force: true, recursive: true });
    await rm(upstreamBare, { force: true, recursive: true });
    await rm(work, { force: true, recursive: true });
  }
});
