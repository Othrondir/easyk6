import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class HomePage extends BasePage {
  protected readonly pageUrl = '';
  protected readonly pageTitle = /Demo/i;

  private readonly mainContent: Locator;
  private readonly firstLink: Locator;

  constructor(page: Page) {
    super(page);
    this.mainContent = page.locator('#main').first();
    this.firstLink = page.locator('a').first();
  }

  async waitForHomePageContent(): Promise<void> {
    await this.mainContent.waitFor({ state: 'visible', timeout: 5000 });
  }

  async verifyVisible(): Promise<void> {
    await expect(this.mainContent).toBeVisible();
    await expect(this.firstLink).toBeVisible({ timeout: 3000 });
  }

  async verifyTitleHasText(): Promise<void> {
    await expect(this.mainContent).toHaveText('hi');
  }
}
