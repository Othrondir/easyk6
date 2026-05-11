import { sleep } from 'k6';

import { HomePage } from '@pages/HomePage';

import type { ScenarioFn } from './index';

/**
 * home-smoke — exercises HomePage POM end-to-end (D-53, D-56, D-57).
 *
 * Recruiter narrative: this scenario is the ONE journey that proves the full
 * pipeline (sync -> convert -> patch-injection -> k6 browser -> real demo
 * target -> measured navigation). The simulation entry has already done
 * `await page.goto(baseUrl)` so the browser is on the demo home URL at the
 * moment this fn is invoked.
 *
 * Behavior:
 *   1. Construct HomePage(page).
 *   2. Call the k6-only navigation-timing helper exercise — invokes the
 *      patch body (defined in lib/pages-k6-patches/HomePage.k6-patch.ts and
 *      concatenated into the generated POM during convert-pages). Inside the
 *      patch: await navigate() (no-op when pageUrl=='') + await
 *      waitForHomePageContent() (real wait on mainContent locator).
 *   3. Three visibility assertions via POM-exposed surface:
 *      - mainContent locator (the home main section)
 *      - navigation component (the site nav, composed under home.navigation)
 *      - blogPosts container (the recent-posts list, composed under home.blogPosts)
 *   4. Single one-second pacing call at the end — D-58.
 *
 * Errors propagate unhandled (D-59) — k6 marks the iteration failed and the
 * stack lands in the console summary. No try/catch wrap.
 */
export const homeSmokeScenario: ScenarioFn = async ({ page }) => {
  const home = new HomePage(page);

  const navMs = await home.measureNavigation();
  console.log(`[home-smoke] navigation completed in ${navMs}ms`);

  await home
    .getMainContentLocator()
    .waitFor({ state: 'visible', timeout: 10000 });

  await home.navigation.isVisible();

  await home.blogPosts
    .getPostsContainerLocator()
    .waitFor({ state: 'visible', timeout: 10000 });

  sleep(1);
};
