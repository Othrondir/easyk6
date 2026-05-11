/**
 * EXAMPLE PROFILE — capacity testing shape.
 * Smoke is the supported demo path; this profile is illustrative of how
 * the same architecture (registry, runner, summary) scales beyond smoke.
 * See README §Profiles.
 */
import { browser } from 'k6/browser';
import exec from 'k6/execution';

import { resolveRuntimeConfig } from '@config';
import { K6PlaywrightSelectors } from '@pages/base/selectors';
import { SCENARIO_REGISTRY } from '@lib/scenarios';

import { makeHandleSummary } from './lib/summary';

declare const __ENV: Record<string, string | undefined>;

/**
 * Capacity profile options (D-05..D-08).
 *
 * Semantics (D-05): find-the-breaking-point, NOT sustain-the-target. PASS
 * in the recruiter narrative = "we discovered the ceiling" — a soft threshold
 * trip IS the signal, not a failure.
 *
 * Executor (D-06): ramping-arrival-rate — iter/s ramp decouples throughput
 * from chromium spin-up cost. Throughput is the X axis.
 *
 * Stage (D-07): 0 → 10 iter/s over 180s. preAllocatedVUs=maxVUs=10 caps the
 * VU pool — RESEARCH §5 Pitfall 6 documents the intentional ceiling.
 *
 * Thresholds (D-08 amended 2026-05-11):
 *   - browser_web_vital_lcp     p(95)<4000
 *   - http_req_failed           rate<0.05
 *   - browser_http_req_duration p(95)<3000  (RETARGETED from http_req_duration)
 *   - iteration_duration        p(95)<30000
 *
 * Soft thresholds (D-08): full ramp completes; the report narrates which
 * thresholds tripped at which point.
 */
export const options = {
  scenarios: {
    browser: {
      executor: 'ramping-arrival-rate',
      startRate: 0,
      timeUnit: '1s',
      preAllocatedVUs: 10,
      maxVUs: 10,
      stages: [
        { duration: '180s', target: 10 },
      ],
      options: {
        browser: { type: 'chromium' },
      },
    },
  },
  thresholds: {
    browser_web_vital_lcp: ['p(95)<4000'],
    http_req_failed: ['rate<0.05'],
    browser_http_req_duration: ['p(95)<3000'],
    iteration_duration: ['p(95)<30000'],
  },
};

/**
 * handleSummary writes `reports/capacity-<scenario>.md` + `.json` on every
 * run via the shared factory (CONTEXT D-16, PROF-04). Plan 04-01 surface.
 *
 * `scenarioGetter` / `baseUrlGetter` defer `__ENV` reads to call-time
 * (RESEARCH Pitfall 4 — k6 populates `__ENV` after module-init).
 */
export const handleSummary = makeHandleSummary({
  profile: 'capacity',
  scenarioGetter: () => __ENV.SCENARIO ?? 'home-smoke',
  baseUrlGetter: () => __ENV.BASE_URL ?? '',
});

/**
 * Capacity simulation entry.
 *
 * Same dispatch contract as smoke.ts and load.ts: resolveRuntimeConfig +
 * SCENARIO_REGISTRY lookup + Q3 page.goto landmine fix + exec.test.abort
 * fail-fast. Only the `options` literal and the announce-banner profile
 * string differ.
 */
export default async function capacitySimulation(): Promise<void> {
  const runtimeConfig = resolveRuntimeConfig(
    {
      profile: __ENV.K6_PROFILE,
      scenario: __ENV.K6_SCENARIO,
      baseUrl: __ENV.BASE_URL,
      demo: __ENV.K6_DEMO === 'true',
    },
    __ENV
  );

  const scenarioId = __ENV.SCENARIO ?? 'home-smoke';
  const entry = SCENARIO_REGISTRY[scenarioId];

  if (!entry) {
    const available = Object.keys(SCENARIO_REGISTRY).join(', ');
    const message = `Unknown scenario '${scenarioId}'. Available: ${available}`;
    // exec.test.abort triggers a non-zero process exit (SCEN-03 fail-fast —
    // Phase 03-02 deviation D-04).
    exec.test.abort(message);
    throw new Error(message);
  }

  const page = await browser.newPage();
  const selectors = new K6PlaywrightSelectors(page);

  console.log(
    `[easyk6] capacity scenario=${scenarioId} profile=${runtimeConfig.profile} baseUrl=${runtimeConfig.baseUrl}`
  );
  console.log(`[easyk6] ${entry.description}`);

  try {
    // Q3 landmine fix (Phase 03-01 D-A7): explicit goto BEFORE entry.fn.
    await page.goto(runtimeConfig.baseUrl);

    await entry.fn({ page, selectors });
  } finally {
    await page.close();
  }
}
