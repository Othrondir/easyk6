import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import ts from 'typescript';

const runtimeConfigPath = new URL('../../lib/config/runtime-config.ts', import.meta.url);
const runtimeConfigModule = await loadTypeScriptModule(runtimeConfigPath);

const {
  DEMO_BASE_URL,
  DEFAULT_ENV_FILE,
  DEFAULT_SCENARIO,
  PHASE_ONE_SMOKE_ENTRY_FILE,
  resolveRuntimeConfig,
} = runtimeConfigModule;

async function loadTypeScriptModule(fileUrl) {
  const source = await readFile(fileUrl, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: fileUrl.pathname,
  });

  const encoded = Buffer.from(outputText, 'utf8').toString('base64');
  return import(`data:text/javascript;base64,${encoded}`);
}

async function loadEnvFile(filePath) {
  const content = await readFile(filePath, 'utf8');
  const env = {};

  for (const line of content.split(/\r?\n/u)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    env[key] = value;
  }

  return env;
}

test('uses the built-in demo target when demo mode is enabled', () => {
  const config = resolveRuntimeConfig({ demo: true }, {});

  assert.equal(config.baseUrl, DEMO_BASE_URL);
  assert.equal(config.envFile, DEFAULT_ENV_FILE);
  assert.equal(config.scenario, DEFAULT_SCENARIO);
  assert.equal(config.entryFile, PHASE_ONE_SMOKE_ENTRY_FILE);
});

test('loads BASE_URL from a root env file', async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'easyk6-runtime-config-'));
  const envFile = path.join(tempDir, '.env');

  try {
    await writeFile(envFile, 'BASE_URL=https://env.example.test/path\n', 'utf8');

    const config = resolveRuntimeConfig(
      { envFile },
      await loadEnvFile(envFile)
    );

    assert.equal(config.baseUrl, 'https://env.example.test/path');
    assert.equal(config.envFile, envFile);
  } finally {
    await rm(tempDir, { force: true, recursive: true });
  }
});

test('CLI override beats env file', async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'easyk6-runtime-config-'));
  const envFile = path.join(tempDir, '.env');

  try {
    await writeFile(envFile, 'BASE_URL=https://env.example.test\n', 'utf8');

    const config = resolveRuntimeConfig(
      {
        envFile,
        baseUrl: 'https://cli.example.test/override',
      },
      await loadEnvFile(envFile)
    );

    assert.equal(config.baseUrl, 'https://cli.example.test/override');
  } finally {
    await rm(tempDir, { force: true, recursive: true });
  }
});

test('rejects malformed URLs', () => {
  assert.throws(
    () => resolveRuntimeConfig({ baseUrl: 'notaurl' }, {}),
    /BASE_URL must be a valid absolute URL\./u
  );
});

test('requires BASE_URL when demo mode is disabled', () => {
  assert.throws(
    () => resolveRuntimeConfig({}, {}),
    /BASE_URL is required when demo mode is disabled\./u
  );
});
