import { sleep } from 'k6';

import { HomePage } from '@pages/HomePage';
import { PostPage } from '@pages/PostPage';

import type { ScenarioFn } from './index';

/**
 * blog-post-smoke — exercises HomePage + PostPage end-to-end (D-56, D-57).
 *
 * Recruiter narrative: the registry has DEPTH — two POMs, two journeys, one
 * runner. The simulation entry has navigated to the demo home URL already;
 * this scenario then composes home -> click first post -> assert PostPage
 * content.
 *
 * Behavior:
 *   1. Construct HomePage(page) and PostPage(page).
 *   2. Call home.navigate() — internally no-ops on pageUrl=='' but exercises
 *      the K6Page contract path. waitForHomePageContent waits for mainContent.
 *   3. Visibility check on home mainContent locator.
 *   4. One-second pacing call (D-58 — one between major steps).
 *   5. home.blogPosts.clickPostByIndex(0) — clicks the most recent post; the
 *      component waits for network-idle internally.
 *   6. Two visibility waits on the PostPage: title locator + body locator.
 *   7. Final one-second pacing call.
 *
 * Errors propagate unhandled (D-59).
 */
export const blogPostSmokeScenario: ScenarioFn = async ({ page }) => {
  const home = new HomePage(page);
  const post = new PostPage(page);

  await home.navigate();
  await home
    .getMainContentLocator()
    .waitFor({ state: 'visible', timeout: 10000 });
  sleep(1);

  await home.blogPosts.clickPostByIndex(0);

  await post
    .getPostTitleLocator()
    .waitFor({ state: 'visible', timeout: 10000 });
  await post
    .getPostBodyLocator()
    .waitFor({ state: 'visible', timeout: 10000 });

  sleep(1);
};
