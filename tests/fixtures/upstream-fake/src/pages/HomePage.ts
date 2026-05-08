import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class HomePage extends BasePage {
  protected readonly pageUrl = '';
  private readonly mainContent: Locator;

  constructor(page: Page) {
    super(page);
    this.mainContent = page.locator('#main').first();
  }

  async verifyVisible(): Promise<void> {
    await expect(this.mainContent).toBeVisible();
  }
}
