import { browser } from 'k6/browser';

import { resolveRuntimeConfig } from '@config';

declare const __ENV: Record<string, string | undefined>;

export const options = {
  scenarios: {
    smoke: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 1,
      options: {
        browser: { type: 'chromium' },
      },
    },
  },
};

export default async function smokeShell(): Promise<void> {
  const runtimeConfig = resolveRuntimeConfig(
    {
      profile: __ENV.K6_PROFILE,
      scenario: __ENV.K6_SCENARIO,
      baseUrl: __ENV.BASE_URL,
      demo: __ENV.K6_DEMO === 'true',
    },
    __ENV
  );
  const page = await browser.newPage();

  console.log(
    `[easyk6] smoke profile=${runtimeConfig.profile} baseUrl=${runtimeConfig.baseUrl}`
  );

  try {
    await page.goto(runtimeConfig.baseUrl);
  } finally {
    await page.close();
  }
}
