import type { Page } from 'k6/browser';
import type { K6PlaywrightSelectors } from '@pages/base/selectors';

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

// Plan 03-01 placeholder bodies. Plan 03-02 replaces these with imports from
// `./home-smoke` and `./blog-post-smoke`. The placeholders MUST still be
// async functions returning Promise<void> so the registry-shape unit test
// (tests/unit/scenarios-registry.test.mjs) passes the `typeof fn === 'function'`
// check and the smoke entry's dispatch path is exercisable end-to-end.
const placeholderHomeSmoke: ScenarioFn = async () => {
  // intentionally empty — real body lives in lib/scenarios/home-smoke.ts (Plan 03-02)
};
const placeholderBlogPostSmoke: ScenarioFn = async () => {
  // intentionally empty — real body lives in lib/scenarios/blog-post-smoke.ts (Plan 03-02)
};

export const SCENARIO_REGISTRY: Record<string, Scenario> = {
  'home-smoke': {
    fn: placeholderHomeSmoke,
    description:
      'Navigate to HomePage; verify masthead, navigation, and posts list visibility.',
    pages: ['HomePage'],
  },
  'blog-post-smoke': {
    fn: placeholderBlogPostSmoke,
    description:
      'Navigate to HomePage; open a post; verify PostPage title and body visibility.',
    pages: ['HomePage', 'PostPage'],
  },
};
