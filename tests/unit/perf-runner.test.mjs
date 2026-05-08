import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..'
);
const runnerScript = path.join(projectRoot, 'scripts', 'perf-runner.mjs');

function runRunner(args, env) {
  const result = spawnSync(process.execPath, [runnerScript, ...args], {
    cwd: projectRoot,
    env,
    encoding: 'utf8',
  });

  return result;
}

test('shell-provided BASE_URL is accepted by the public runner', () => {
  const env = {
    ...process.env,
    BASE_URL: 'https://shell.example.test',
  };
  delete env.K6_PROFILE;
  delete env.K6_SCENARIO;

  const result = runRunner(['--profile', 'smoke', '--dry-run'], env);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Resolved base URL: https:\/\/shell\.example\.test\//u);
  assert.match(result.stdout, /k6 run dist\/tests\/smoke\/smoke-shell\.test\.js/u);
});

test('env file beats shell BASE_URL in the public runner', async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'easyk6-perf-runner-'));
  const envFile = path.join(tempDir, '.env');

  try {
    await writeFile(envFile, 'BASE_URL=https://env.example.test\n', 'utf8');

    const env = {
      ...process.env,
      BASE_URL: 'https://shell.example.test',
    };

    const result = runRunner(
      ['--profile', 'smoke', '--env-file', envFile, '--dry-run'],
      env
    );

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /Resolved base URL: https:\/\/env\.example\.test\//u);
  } finally {
    await rm(tempDir, { force: true, recursive: true });
  }
});
