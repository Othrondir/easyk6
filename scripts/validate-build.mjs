import { existsSync } from 'node:fs';

const requiredFiles = [
  'dist/tests/smoke/smoke-shell.test.js',  // Phase 1 shell — removed in Plan 03-02 after smoke validation
  'dist/simulations/smoke.js',             // Plan 03-01 canonical entry (D-62)
  'scripts/perf-runner.mjs',
  '.env.example',
  'lib/config/runtime-config.ts',
];

const missingFiles = requiredFiles.filter((file) => !existsSync(file));

if (missingFiles.length > 0) {
  console.error(`Missing required files: ${missingFiles.join(', ')}`);
  process.exit(1);
}

console.log(`Validated build shell: ${requiredFiles.join(', ')}`);
