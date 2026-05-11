#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
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

function mergeRuntimeEnv(shellEnv, loadedEnv) {
  return { ...shellEnv, ...loadedEnv };
}

function toRunnerEnv(runtimeConfig, mergedEnv) {
  return {
    ...mergedEnv,
    BASE_URL: runtimeConfig.baseUrl,
    K6_PROFILE: runtimeConfig.profile,
    K6_SCENARIO: runtimeConfig.scenario,
    K6_DEMO: String(runtimeConfig.demo),
  };
}

function buildK6Args(runtimeConfig) {
  // k6 1.5 does NOT inherit shell env vars into __ENV without
  // --include-system-env-vars. Pass every var the simulation reads
  // (smoke.ts:resolveRuntimeConfig) as explicit -e flags so __ENV
  // is populated inside goja. SCENARIO drives registry dispatch (D-61).
  return [
    'run',
    '-e', `SCENARIO=${runtimeConfig.scenario}`,
    '-e', `BASE_URL=${runtimeConfig.baseUrl}`,
    '-e', `K6_PROFILE=${runtimeConfig.profile}`,
    '-e', `K6_SCENARIO=${runtimeConfig.scenario}`,
    '-e', `K6_DEMO=${String(runtimeConfig.demo)}`,
    runtimeConfig.entryFile,
  ];
}

function printDryRun(runtimeConfig) {
  console.log(`Resolved base URL: ${runtimeConfig.baseUrl}`);
  console.log(`k6 ${buildK6Args(runtimeConfig).join(' ')}`);
}

async function runK6(runtimeConfig, mergedEnv) {
  const entryPath = resolveFromProjectRoot(runtimeConfig.entryFile);

  if (!existsSync(entryPath)) {
    throw new Error(
      `Build artifact not found: ${runtimeConfig.entryFile}. Run npm run build first.`
    );
  }

  // Plan 04-02 deviation: handleSummary writes reports/<profile>-<scenario>.{md,json}
  // (Plan 04-01 D-11 contract). k6 does not auto-mkdir parent dirs and logs
  // `level=error msg="failed to handle the end-of-test summary"` if reports/
  // is missing. Pre-create it here so the artifact-emission contract holds
  // on a clean clone without forcing a tracked `reports/.gitkeep`.
  mkdirSync(resolveFromProjectRoot('reports'), { recursive: true });

  // Plan 03-02 evidence requirement: real runs must announce the same banner
  // as --dry-run so captured stdout proves the resolved config + launched cmd.
  console.log(`Resolved base URL: ${runtimeConfig.baseUrl}`);
  console.log(`k6 ${buildK6Args(runtimeConfig).join(' ')}`);

  await new Promise((resolve, reject) => {
    const child = spawn(
      'k6',
      buildK6Args(runtimeConfig),
      {
        cwd: projectRoot,
        env: toRunnerEnv(runtimeConfig, mergedEnv),
        stdio: 'inherit',
      }
    );

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
  const mergedEnv = mergeRuntimeEnv(process.env, loadedEnv);
  const runtimeConfig = resolveRuntimeConfig(
    { ...cliOptions, envFile },
    mergedEnv
  );

  if (runtimeConfig.showConfig) {
    console.log(JSON.stringify(runtimeConfig, null, 2));
    return;
  }

  if (runtimeConfig.dryRun) {
    printDryRun(runtimeConfig);
    return;
  }

  await runK6(runtimeConfig, mergedEnv);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
