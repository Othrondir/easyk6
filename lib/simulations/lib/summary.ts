/**
 * handleSummary factory for k6 simulation entries (PROF-04, CONTEXT D-16).
 *
 * Each simulation (smoke/load/capacity) wires up its handleSummary export by
 * calling this factory ONCE at module scope:
 *
 *   import { makeHandleSummary } from './lib/summary';
 *
 *   export const handleSummary = makeHandleSummary({
 *     profile: 'smoke',  // or 'load' / 'capacity'
 *     scenarioGetter: () => __ENV.SCENARIO ?? 'home-smoke',
 *     baseUrlGetter: () => __ENV.BASE_URL ?? '',
 *   });
 *
 * Why getters and not direct values? `__ENV` is populated by k6 AFTER
 * module-init (RESEARCH §5 Pitfall 4). Reading it at module scope would
 * give undefined. Deferring the read to handleSummary-call time via a thunk
 * gives the correct per-run value.
 *
 * Goja-safety contract (D-19):
 *   - Imports limited to `./format-md` + `./format-json` (sibling helpers).
 *   - No `new URL`, no Buffer, no process, no Node fs/path.
 *   - `new Date().toISOString()` is goja-safe (ES5.1+ standard).
 *   - POSIX forward-slash path keys ALWAYS (k6 writes cross-platform; the
 *     keys become file paths under k6 cwd, and forward-slash works on
 *     Windows + POSIX uniformly).
 *
 * Output contract (k6 handleSummary):
 *   handleSummary(data) returns Record<string, string> where keys are
 *   file paths relative to k6 cwd. perf-runner.mjs sets cwd: projectRoot
 *   so `reports/<profile>-<scenario>.md` lands at <repo>/reports/...
 */
import { formatMarkdown } from './format-md';
import { formatJson } from './format-json';

export interface ProfileMetadata {
  profile: string;
  scenarioGetter: () => string | undefined;
  baseUrlGetter: () => string | undefined;
}

export function makeHandleSummary(metadata: ProfileMetadata) {
  return function handleSummary(data: unknown): Record<string, string> {
    const rawScenario = metadata.scenarioGetter() ?? '';
    const scenario = rawScenario.trim() || 'home-smoke';
    const baseUrl = metadata.baseUrlGetter() ?? '';
    const baseName = `reports/${metadata.profile}-${scenario}`;
    const meta = {
      profile: metadata.profile,
      scenario,
      baseUrl,
      runDateIso: new Date().toISOString(),
    };
    return {
      [`${baseName}.md`]: formatMarkdown(data as never, meta),
      [`${baseName}.json`]: formatJson(data),
    };
  };
}
