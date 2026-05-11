import { browser } from 'k6/browser';
import exec from 'k6/execution';

import { resolveRuntimeConfig } from '@config';
import { K6PlaywrightSelectors } from '@pages/base/selectors';
import { SCENARIO_REGISTRY } from '@lib/scenarios';

declare const __ENV: Record<string, string | undefined>;

/**
 * Smoke profile options (D-63..D-67).
 *
 * Shape rules:
 * - `shared-iterations` executor (D-65) with vus=1, iterations=1 (D-64) yields
 *   exactly one full journey per `npm run smoke` invocation — deterministic,
 *   demo-grade.
 * - `options.browser.type: 'chromium'` is required by k6 1.5.x browser module
 *   for the browser scenario to launch.
 * - Thresholds are loose-but-real (D-66): single-iteration variance is large,
 *   so values are tuned to give the smoke a real pass/fail verdict without
 *   false-positiving against GitHub Pages cold cache + home Wi-Fi noise.
 *   See RESEARCH §6.5 Nyquist honesty note.
 */
export const options = {
  scenarios: {
    browser: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 1,
      options: {
        browser: { type: 'chromium' },
      },
    },
  },
  thresholds: {
    browser_web_vital_lcp: ['p(95)<3000'],
    http_req_failed: ['rate<0.01'],
    iteration_duration: ['p(95)<15000'],
  },
};

/**
 * Smoke simulation entry.
 *
 * Sequence:
 *   1. Resolve runtime config (CLI > .env > demo defaults — Phase 1 D-12).
 *   2. Read __ENV.SCENARIO (D-60, default 'home-smoke' per D-53).
 *   3. Look up the scenario in SCENARIO_REGISTRY; fail-fast on unknown (D-55).
 *   4. Construct a k6 browser Page + a fresh K6PlaywrightSelectors instance.
 *   5. Explicit `page.goto(baseUrl)` — THIS IS THE Q3 LANDMINE FIX
 *      (RESEARCH §7 Q3.1, Assumption A7). HomePage.pageUrl is '' so
 *      `home.navigate()` would otherwise no-op. The entry MUST land the
 *      browser on the demo target BEFORE handing off to the scenario.
 *   6. Dispatch to entry.fn({ page, selectors }).
 *   7. Always close the page in `finally`.
 */
export default async function smokeSimulation(): Promise<void> {
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
    // exec.test.abort triggers a non-zero process exit (SCEN-03 fail-fast).
    // A raw `throw` alone is insufficient: k6 1.5 reports exit 0 when all
    // thresholds pass, even if the iteration body throws an uncaught error.
    exec.test.abort(message);
    throw new Error(message);
  }

  const page = await browser.newPage();
  const selectors = new K6PlaywrightSelectors(page);

  console.log(
    `[easyk6] smoke scenario=${scenarioId} profile=${runtimeConfig.profile} baseUrl=${runtimeConfig.baseUrl}`
  );
  console.log(`[easyk6] ${entry.description}`);

  try {
    // Q3 landmine fix: HomePage.pageUrl is '' so the K6Page.navigate() guard
    // (`if (this.pageUrl)`) short-circuits. The scenario CANNOT assume the
    // browser is on the demo target unless the entry navigates first.
    // See RESEARCH §7 Q3.1, Assumption A7.
    await page.goto(runtimeConfig.baseUrl);

    await entry.fn({ page, selectors });
  } finally {
    await page.close();
  }
}
