export const DEMO_BASE_URL = 'https://othrondir.github.io/QAbbalah/';
export const DEFAULT_ENV_FILE = '.env';
export const DEFAULT_PROFILE = 'smoke';
export const DEFAULT_SCENARIO = 'home-smoke';
export const SMOKE_ENTRY_FILE = 'dist/simulations/smoke.js';

export const RUNTIME_FLAG_DEFINITIONS = [
  {
    flags: '--profile <profile>',
    description: 'Execution profile to run.',
  },
  {
    flags: '--scenario <scenario>',
    description: 'Scenario name to resolve.',
  },
  {
    flags: '--base-url <url>',
    description: 'Absolute base URL override for the target.',
  },
  {
    flags: '--env-file <path>',
    description: 'Path to a root-style .env file. Defaults to .env.',
  },
  {
    flags: '--demo',
    description: 'Use built-in demo defaults when no URL override exists.',
  },
  {
    flags: '--show-config',
    description: 'Print normalized runtime config and exit.',
  },
  {
    flags: '--dry-run',
    description: 'Print the exact k6 command and exit.',
  },
] as const;

export type RuntimeCliOptions = {
  profile?: string;
  scenario?: string;
  baseUrl?: string;
  envFile?: string;
  demo?: boolean;
  showConfig?: boolean;
  dryRun?: boolean;
};

export type RuntimeConfig = {
  profile: string;
  scenario: string;
  baseUrl: string;
  demo: boolean;
  envFile: string;
  showConfig: boolean;
  dryRun: boolean;
  entryFile: string;
};

type ProcessEnvLike = Record<string, string | undefined>;

function normalizeValue(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function resolveEntryFile(profile: string): string {
  return `dist/simulations/${profile}.js`;
}

// k6 1.5 goja runtime has no global URL constructor, so validation must avoid
// `new URL(...)`. Regex-based normalizer matches scheme+host and appends `/`
// for bare-host inputs (matches the trailing-slash behavior the public CLI
// tests expect when the user supplies BASE_URL=https://example.test).
function normalizeBaseUrl(baseUrl: string): string {
  const match = /^(https?:\/\/[^/\s]+)(\/.*)?$/iu.exec(baseUrl);
  if (!match) {
    throw new Error('BASE_URL must be a valid absolute URL.');
  }
  const [, origin, pathAndRest] = match;
  return pathAndRest ? `${origin}${pathAndRest}` : `${origin}/`;
}

/**
 * Precedence is intentionally centralized here: CLI > .env > built-in demo defaults.
 */
export function resolveRuntimeConfig(
  options: RuntimeCliOptions = {},
  env: ProcessEnvLike = process.env
): RuntimeConfig {
  const profile = normalizeValue(options.profile) ?? DEFAULT_PROFILE;
  const scenario = normalizeValue(options.scenario) ?? DEFAULT_SCENARIO;
  const envFile = normalizeValue(options.envFile) ?? DEFAULT_ENV_FILE;
  const demo = options.demo === true;
  const showConfig = options.showConfig === true;
  const dryRun = options.dryRun === true;
  const baseUrlValue =
    normalizeValue(options.baseUrl) ??
    normalizeValue(env.BASE_URL) ??
    (demo ? DEMO_BASE_URL : undefined);

  if (!baseUrlValue) {
    throw new Error('BASE_URL is required when demo mode is disabled.');
  }

  return {
    profile,
    scenario,
    baseUrl: normalizeBaseUrl(baseUrlValue),
    demo,
    envFile,
    showConfig,
    dryRun,
    entryFile: resolveEntryFile(profile),
  };
}
