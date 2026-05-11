#!/usr/bin/env node

// scripts/sync-src.mjs
// Real implementation for `npm run sync:src`.
// Mirrors the Playwright Page Objects from upstream `easyPlaywright/src/pages/`
// into local `src/pages/`. Modes: local filesystem copy (default) and git clone.
// Locked decisions: D-22 .. D-28 (see .planning/phases/02-upstream-sync-k6-adaptation/02-CONTEXT.md).

import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

import { Command } from 'commander';

// projectRoot is derived from process.cwd() so that:
//   1) Real runs (`cd easyk6 && npm run sync:src`) target the easyk6 repo root.
//   2) Tests can drive the script with `cwd: <tmpRoot>` and assert against
//      `<tmpRoot>/src/pages/` without polluting the real working tree.
// The path-safety check below also consults the script's own location so that
// source fixtures shipped inside the easyk6 repo remain accessible during tests.
const projectRoot = path.resolve(process.cwd());
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const scriptRoot = path.resolve(scriptDir, '..');

// TARGET_DIR is hardcoded — no override flag is exposed (T-V12-01).
const TARGET_DIR = path.join(projectRoot, 'src', 'pages');
const META_FILE = path.join(TARGET_DIR, '.sync-meta.json');

function buildCli() {
  const program = new Command();
  program
    .name('easyk6-sync')
    .description('Sync Playwright Page Objects from upstream into easyk6/src/pages.')
    .option('--source <path>', 'Local upstream root (sibling repo by default)')
    .option(
      '--repo <url>',
      'Git URL to clone upstream from (mutually exclusive with --source)'
    )
    .option('--branch <ref>', 'Git branch to clone', 'main')
    .option('-y, --yes', 'Skip the confirmation prompt before wiping src/pages/');
  // Disable commander's default exit behavior so we can format errors uniformly.
  program.exitOverride();
  return program;
}

// ---------- helpers ported from ir-perf-k6/scripts/sync-frontend-src.mjs ----------

// Verbatim port of `run()` (sync-frontend-src.mjs:78-91) — promise wrapper around child spawn.
function run(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      ...options,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => {
      stdout += d.toString();
    });
    child.stderr.on('data', (d) => {
      stderr += d.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else
        reject(
          new Error(
            `${cmd} ${args.join(' ')} exited with code ${code}: ${stderr || stdout}`
          )
        );
    });
  });
}

// Verbatim port of `checkGit()` (sync-frontend-src.mjs:93-99).
async function checkGit() {
  try {
    await run('git', ['--version']);
  } catch (e) {
    throw new Error('Git is required on PATH. Please install Git and retry.');
  }
}

// Verbatim port of `promptConfirm()` (sync-frontend-src.mjs:101-106).
async function promptConfirm(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const answer = await new Promise((resolve) => rl.question(question, resolve));
  rl.close();
  return /^y(es)?$/i.test(answer.trim());
}

// Verbatim port of `emptyDir()` (sync-frontend-src.mjs:112-121) — empty without erroring on ENOENT.
// Plan 03-01 (RESEARCH §3.3): preserve `.gitkeep` so the directory stays
// tracked across sync cycles (the .gitignore !src/pages/.gitkeep allowlist
// only protects from gitignore, not from the wipe). One-line .filter insert
// keeps the rest of the orchestration byte-identical.
async function emptyDir(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const tasks = entries
      .filter((e) => e.name !== '.gitkeep')
      .map(async (e) =>
        fs.rm(path.join(dir, e.name), { recursive: true, force: true })
      );
    await Promise.all(tasks);
  } catch (e) {
    if (e && e.code === 'ENOENT') return; // nothing to empty
    throw e;
  }
}

// ---------- mode + path resolution ----------

function selectMode(opts) {
  if (opts.repo) return 'git';
  return 'local';
}

function resolveLocalSource(opts) {
  const envValue =
    process.env.EASYPLAYWRIGHT_SRC && process.env.EASYPLAYWRIGHT_SRC.length > 0
      ? process.env.EASYPLAYWRIGHT_SRC
      : undefined;
  // Locked precedence (T-V14-01): --source > EASYPLAYWRIGHT_SRC > sibling default.
  const candidate =
    opts.source ?? envValue ?? path.resolve(projectRoot, '..', 'easyPlaywright');
  return path.resolve(candidate);
}

// T-V5-01 / T-V12-02 mitigation: resolve symlinks via realpath and refuse any
// path outside the safe-roots set. Two roots are accepted:
//   - cwd-derived projectRoot (and its parent tree, which holds the sibling
//     `easyPlaywright` clone for real runs)
//   - the script's own real location (and its parent tree), which keeps test
//     fixtures inside `tests/fixtures/...` reachable when the test driver runs
//     the script with `cwd: <tmpRoot>`
async function assertSourceWithinSafeRoots(resolvedSource) {
  let real;
  try {
    real = await fs.realpath(resolvedSource);
  } catch (e) {
    throw new Error(`Upstream source not found: ${resolvedSource}`);
  }

  async function realpathOrSelf(p) {
    try {
      return await fs.realpath(p);
    } catch {
      return p;
    }
  }

  const realProjectRoot = await realpathOrSelf(projectRoot);
  const realScriptRoot = await realpathOrSelf(scriptRoot);
  const candidates = [
    realProjectRoot,
    path.dirname(realProjectRoot),
    realScriptRoot,
    path.dirname(realScriptRoot),
  ];

  for (const root of candidates) {
    if (real === root || real.startsWith(root + path.sep)) {
      return;
    }
  }

  throw new Error(
    `Upstream source is outside the project root and its parent (path traversal not allowed): ${real}`
  );
}

// ---------- mode dispatchers ----------

async function syncLocal(opts) {
  const resolvedSource = resolveLocalSource(opts);
  await assertSourceWithinSafeRoots(resolvedSource);
  const upstreamPages = path.join(resolvedSource, 'src', 'pages');
  const exists = await fs
    .stat(upstreamPages)
    .then((s) => s.isDirectory())
    .catch(() => false);
  if (!exists) {
    throw new Error(
      `Expected 'src/pages' inside upstream (not found): ${upstreamPages}`
    );
  }
  await fs.mkdir(TARGET_DIR, { recursive: true });
  await emptyDir(TARGET_DIR);
  await fs.cp(upstreamPages, TARGET_DIR, { recursive: true });
  return { source: path.normalize(resolvedSource), mode: 'local' };
}

async function syncGit(opts) {
  if (!opts.repo) throw new Error('--repo is required for git mode.');
  const branch = opts.branch || 'main';
  const tmpParent = await fs.mkdtemp(path.join(os.tmpdir(), 'easyk6-sync-'));
  const tmp = path.join(tmpParent, 'repo');
  try {
    console.log(`[sync-src] Cloning ${opts.repo}#${branch}...`);
    await run('git', ['clone', '--depth', '1', '--branch', branch, opts.repo, tmp]);
    const upstreamPages = path.join(tmp, 'src', 'pages');
    const exists = await fs
      .stat(upstreamPages)
      .then((s) => s.isDirectory())
      .catch(() => false);
    if (!exists) {
      throw new Error(
        `Expected 'src/pages' in remote repository: ${opts.repo}`
      );
    }
    const { stdout } = await run('git', ['-C', tmp, 'rev-parse', 'HEAD']);
    const commit = stdout.trim();
    await fs.mkdir(TARGET_DIR, { recursive: true });
    await emptyDir(TARGET_DIR);
    await fs.cp(upstreamPages, TARGET_DIR, { recursive: true });
    return { source: opts.repo, mode: 'git', branch, commit };
  } finally {
    await fs.rm(tmpParent, { recursive: true, force: true });
  }
}

// ---------- main ----------

async function main() {
  const cli = buildCli();
  try {
    cli.parse(process.argv);
  } catch (err) {
    // commander.exitOverride() throws a CommanderError. --help and --version
    // ask commander to print and exit 0; unknown flags / missing args exit 1.
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
  const opts = cli.opts();

  // 1. Mutual exclusion check (D-24).
  if (opts.source && opts.repo) {
    throw new Error('--source and --repo are mutually exclusive.');
  }

  // 2. Choose mode.
  const mode = selectMode(opts);

  // 3. Confirmation prompt unless skipped (D-28).
  const skipPrompt = Boolean(opts.yes) || process.env.CI === '1';
  if (!skipPrompt) {
    const ok = await promptConfirm(
      `This will replace contents of 'src/pages/'. Continue? [y/N] `
    );
    if (!ok) {
      console.log('Aborted.');
      return;
    }
  }

  // 4. Dispatch.
  let meta;
  if (mode === 'git') {
    await checkGit();
    meta = await syncGit(opts);
  } else {
    meta = await syncLocal(opts);
  }

  // 5. Write provenance metadata.
  meta.syncedAt = new Date().toISOString();
  await fs.mkdir(path.dirname(META_FILE), { recursive: true });
  await fs.writeFile(META_FILE, JSON.stringify(meta, null, 2) + '\n', 'utf8');

  const summary =
    meta.mode === 'git'
      ? `${meta.source} (${(meta.commit || '').slice(0, 7)})`
      : meta.source;
  console.log(`[sync-src] Synced ${summary}`);
  console.log(`[sync-src] Wrote ${path.relative(projectRoot, META_FILE)}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
