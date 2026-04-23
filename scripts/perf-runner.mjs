#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Command } from 'commander';
import { parse as parseDotenv } from 'dotenv';

import {
  DEFAULT_ENV_FILE,
  RUNTIME_FLAG_DEFINITIONS,
  resolveRuntimeConfig,
} from '../lib/config/runtime-config.ts';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function buildCli() {
  const program = new Command();

  program
    .name('easyk6-perf')
    .description('Resolve EasyK6 runtime config and execute the selected k6 entry.');

  for (const option of RUNTIME_FLAG_DEFINITIONS) {
    program.option(option.flags, option.description);
  }

  return program;
}

function resolveFromProjectRoot(filePath) {
  return path.isAbsolute(filePath)
    ? filePath
    : path.resolve(projectRoot, filePath);
}

function envFileWasExplicit(argv) {
  return argv.some(
    (arg) => arg === '--env-file' || arg.startsWith('--env-file=')
  );
}

function loadRuntimeEnv(envFile, explicitFile) {
  const resolvedPath = resolveFromProjectRoot(envFile);

  if (!existsSync(resolvedPath)) {
    if (explicitFile) {
      throw new Error(`Env file not found: ${resolvedPath}`);
    }

    return {};
  }

  return parseDotenv(readFileSync(resolvedPath, 'utf8'));
}

function toRunnerEnv(runtimeConfig, loadedEnv) {
  return {
    ...process.env,
    ...loadedEnv,
    BASE_URL: runtimeConfig.baseUrl,
    K6_PROFILE: runtimeConfig.profile,
    K6_SCENARIO: runtimeConfig.scenario,
    K6_DEMO: String(runtimeConfig.demo),
  };
}

function printDryRun(runtimeConfig) {
  console.log(`Resolved base URL: ${runtimeConfig.baseUrl}`);
  console.log(`k6 run ${runtimeConfig.entryFile}`);
}

async function runK6(runtimeConfig, loadedEnv) {
  const entryPath = resolveFromProjectRoot(runtimeConfig.entryFile);

  if (!existsSync(entryPath)) {
    throw new Error(
      `Build artifact not found: ${runtimeConfig.entryFile}. Run npm run build first.`
    );
  }

  await new Promise((resolve, reject) => {
    const child = spawn('k6', ['run', runtimeConfig.entryFile], {
      cwd: projectRoot,
      env: toRunnerEnv(runtimeConfig, loadedEnv),
      stdio: 'inherit',
    });

    child.on('error', (error) => {
      reject(
        new Error(
          `Failed to start k6: ${error.message}. Ensure k6 is installed and available on PATH.`
        )
      );
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`k6 exited with code ${code ?? 1}.`));
    });
  });
}

async function main() {
  const cli = buildCli();
  cli.parse(process.argv);

  const cliOptions = cli.opts();
  const explicitFile = envFileWasExplicit(process.argv);
  const envFile = cliOptions.envFile ?? DEFAULT_ENV_FILE;
  const loadedEnv = loadRuntimeEnv(envFile, explicitFile);
  const runtimeConfig = resolveRuntimeConfig(
    { ...cliOptions, envFile },
    loadedEnv
  );

  if (runtimeConfig.showConfig) {
    console.log(JSON.stringify(runtimeConfig, null, 2));
    return;
  }

  if (runtimeConfig.dryRun) {
    printDryRun(runtimeConfig);
    return;
  }

  await runK6(runtimeConfig, loadedEnv);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
