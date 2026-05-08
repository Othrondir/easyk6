// K6-SPECIFIC METHODS - Auto-injected by convert-pages.mjs
// These methods are NOT in upstream Playwright Page Objects.
// DO NOT add to src/pages/ — they belong here so they survive re-sync cycles.

  /**
   * k6-only timing helper: measures navigation duration to the home page.
   * Returns elapsed milliseconds. Use this in scenarios that need to record
   * per-iteration page-load timings without enabling k6's full browser
   * performance trace.
   */
  async measureNavigation(): Promise<number> {
    const start = Date.now();
    await this.navigate();
    await this.waitForHomePageContent();
    return Date.now() - start;
  }
