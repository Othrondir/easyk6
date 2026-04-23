import { existsSync } from 'node:fs';

const buildArtifact = 'dist/tests/smoke/smoke-shell.test.js';

if (!existsSync(buildArtifact)) {
  console.error(`Missing build artifact: ${buildArtifact}`);
  process.exit(1);
}

console.log(`Validated build artifact: ${buildArtifact}`);
