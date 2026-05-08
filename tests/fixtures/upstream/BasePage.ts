import { Page, Locator, expect } from '@playwright/test';

export class BasePage {
  protected readonly page: Page;
  protected readonly pageUrl: string;

  constructor(page: Page) {
    this.page = page;
    this.pageUrl = '';
  }

  async navigate(): Promise<void> {
    await this.page.goto(this.pageUrl);
  }
}
