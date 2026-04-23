import { existsSync } from 'node:fs';

const requiredFiles = [
  'dist/tests/smoke/smoke-shell.test.js',
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
