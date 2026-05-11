import type { Page } from 'k6/browser';
import type { K6PlaywrightSelectors } from '@pages/base/selectors';

import { homeSmokeScenario } from './home-smoke';
import { blogPostSmokeScenario } from './blog-post-smoke';

/**
 * Context object passed to every scenario function.
 *
 * - `page` is the k6 browser Page constructed once per iteration by the
 *   simulation entrypoint (lib/simulations/smoke.ts). The entry calls
 *   `await page.goto(baseUrl)` BEFORE invoking the scenario, so scenarios
 *   start on the demo target.
 * - `selectors` is a fresh K6PlaywrightSelectors instance bound to the same
 *   page. Scenarios are free to use it directly OR rely on their POMs.
 */
export interface ScenarioContext {
  page: Page;
  selectors: K6PlaywrightSelectors;
}

export type ScenarioFn = (ctx: ScenarioContext) => Promise<void>;

export interface Scenario {
  fn: ScenarioFn;
  description: string;
  pages: readonly string[];
}

export const SCENARIO_REGISTRY: Record<string, Scenario> = {
  'home-smoke': {
    fn: homeSmokeScenario,
    description:
      'Navigate to HomePage; verify masthead, navigation, and posts list visibility.',
    pages: ['HomePage'],
  },
  'blog-post-smoke': {
    fn: blogPostSmokeScenario,
    description:
      'Navigate to HomePage; open a post; verify PostPage title and body visibility.',
    pages: ['HomePage', 'PostPage'],
  },
};
