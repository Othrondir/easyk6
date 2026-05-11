/**
 * EXAMPLE PROFILE — load testing shape.
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
 * Load profile options (D-01..D-04).
 *
 * Executor: ramping-vus, classic 3-stage shape (D-01) — peak 5 concurrent VUs,
 * total ~2 minutes wall time. Recruiter-recognized load shape.
 *
 * Thresholds (D-03 amended 2026-05-11):
 *   - browser_web_vital_lcp p(95)<4000  (concurrent chromium depresses LCP)
 *   - http_req_failed       rate<0.05    (sub-resource flake amplifies at 5 VUs)
 *   - iteration_duration    p(95)<25000  (concurrent journeys take longer)
 *   - browser_http_req_duration p(95)<2000  (load-relevant chromium latency signal —
 *     RETARGETED from http_req_duration per RESEARCH §5 Pitfall 1 + CONTEXT 2026-05-11
 *     amendment: k6/browser routes HTTP through chromium, leaving http_req_*
 *     empty per Phase 03-02 SUMMARY Run 1 evidence)
 *
 * Soft thresholds (D-04): no `abortOnFail` — trip is summarized, ramp completes.
 */
export const options = {
  scenarios: {
    browser: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 5 },
        { duration: '60s', target: 5 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '30s',
      options: {
        browser: { type: 'chromium' },
      },
    },
  },
  thresholds: {
    browser_web_vital_lcp: ['p(95)<4000'],
    http_req_failed: ['rate<0.05'],
    iteration_duration: ['p(95)<25000'],
    browser_http_req_duration: ['p(95)<2000'],
  },
};

/**
 * handleSummary writes `reports/load-<scenario>.md` + `.json` on every run
 * via the shared factory (CONTEXT D-16, PROF-04). Plan 04-01 surface.
 *
 * `scenarioGetter` / `baseUrlGetter` defer `__ENV` reads to call-time
 * (RESEARCH Pitfall 4 — k6 populates `__ENV` after module-init).
 */
export const handleSummary = makeHandleSummary({
  profile: 'load',
  scenarioGetter: () => __ENV.SCENARIO ?? 'home-smoke',
  baseUrlGetter: () => __ENV.BASE_URL ?? '',
});

/**
 * Load simulation entry.
 *
 * Sequence mirrors smoke.ts exactly (same dispatch contract — registry +
 * Q3 page.goto landmine fix + exec.test.abort fail-fast). The only
 * differences from smoke.ts are the `options` literal above and the
 * announce-banner profile string.
 */
export default async function loadSimulation(): Promise<void> {
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
    // Phase 03-02 deviation D-04). A raw throw alone is insufficient because
    // k6 1.5 reports exit 0 when all thresholds pass even if the iteration
    // body throws.
    exec.test.abort(message);
    throw new Error(message);
  }

  const page = await browser.newPage();
  const selectors = new K6PlaywrightSelectors(page);

  console.log(
    `[easyk6] load scenario=${scenarioId} profile=${runtimeConfig.profile} baseUrl=${runtimeConfig.baseUrl}`
  );
  console.log(`[easyk6] ${entry.description}`);

  try {
    // Q3 landmine fix (Phase 03-01 D-A7): HomePage.pageUrl is '' so
    // K6Page.navigate() short-circuits. The entry MUST land the browser on
    // the demo target before handing off to the scenario.
    await page.goto(runtimeConfig.baseUrl);

    await entry.fn({ page, selectors });
  } finally {
    await page.close();
  }
}
