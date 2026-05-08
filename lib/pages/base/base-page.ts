import { Page } from 'k6/browser';
import { K6PlaywrightSelectors } from './selectors';

/**
 * Base class for k6-compatible Page Object Models.
 *
 * Adapts the upstream easyPlaywright BasePage shape so converted POMs
 * inherit `super.navigate()` without rewrites. Every generated POM under
 * `lib/pages/` extends this class via the converter's R5 transform.
 *
 * NOTE: `lib/pages/base/` is hand-authored and is preserved during the
 * `convert-pages` wipe. Do not move methods that are converter outputs
 * into this file.
 */
export class K6Page {
  protected page: Page;
  protected selectors: K6PlaywrightSelectors;
  protected pageUrl: string = '';
  protected pageTitle: RegExp | string = /.*/;

  constructor(page: Page) {
    this.page = page;
    this.selectors = new K6PlaywrightSelectors(page);
  }

  async navigate(): Promise<void> {
    if (this.pageUrl) {
      await this.page.goto(this.pageUrl);
    }
    await this.waitForLoadState();
  }

  /**
   * [ASSUMED A1 — RESEARCH §Assumptions Log] k6 1.5 exposes
   * `Page.waitForLoadState(state)` with the same shape as Playwright.
   * Verified during Phase 2 execution against k6 docs; this implementation
   * uses runtime feature-detection so a future minor that renames or removes
   * the API degrades to a no-op rather than a crash.
   */
  async waitForLoadState(
    state: 'load' | 'domcontentloaded' | 'networkidle' = 'networkidle'
  ): Promise<void> {
    if ('waitForLoadState' in this.page) {
      await (this.page as { waitForLoadState: (s: string) => Promise<void> }).waitForLoadState(state);
    }
  }
}
