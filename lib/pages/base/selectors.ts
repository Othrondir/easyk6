import { Page } from 'k6/browser';

/**
 * Helper functions to mimic Playwright-like selectors for the k6 browser module.
 *
 * The shim exists for API stability across k6 minor versions and so the
 * converter can rewrite `this.page.getByX` -> `this.selectors.getByX` once
 * instead of touching every transitive call site.
 */
export class K6PlaywrightSelectors {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  getByTestId(testId: string) {
    return this.page.locator(`[data-testid="${testId}"]`);
  }

  getByText(text: string, options?: { exact?: boolean }) {
    if (options?.exact) {
      return this.page
        .locator('*')
        .filter({ hasText: new RegExp(`^${this.escapeRegex(text)}$`) });
    }
    return this.page.locator('*').filter({ hasText: text });
  }

  /**
   * NOTE [A2 — RESEARCH §Assumptions Log, MEDIUM confidence]:
   * This shim approximates accessible-name matching by filtering on visible
   * text via `.filter({ hasText: name })`. That is NOT strict ARIA semantics —
   * it matches any element with role=X whose text contains the name string.
   *
   * For exact accessible-name fidelity, prefer k6 1.5's native
   * `page.getByRole(role, { name })` when stable. This shim feature-detects
   * the native API at call time and forwards to it when present.
   *
   * Recruiter-facing tradeoff: portability across k6 versions vs strict ARIA
   * fidelity. The shim wins on portability; the feature-detect lets us pick
   * up native fidelity for free as soon as k6 ships it.
   */
  getByRole(role: string, options?: { name?: string | RegExp }) {
    // Prefer native page.getByRole when available (A2 fallback path).
    const native = (this.page as { getByRole?: (r: string, o?: { name?: string | RegExp }) => unknown }).getByRole;
    if (typeof native === 'function') {
      return native.call(this.page, role, options);
    }
    const roleLocator = this.page.locator(`[role="${role}"]`);
    if (options?.name) {
      if (typeof options.name === 'string') {
        return roleLocator.filter({
          hasText: new RegExp(`^${this.escapeRegex(options.name)}$`),
        });
      }
      return roleLocator.filter({ hasText: options.name });
    }
    return roleLocator;
  }

  filterByText(locator: any, text: string) {
    return locator.filter({ hasText: text });
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
