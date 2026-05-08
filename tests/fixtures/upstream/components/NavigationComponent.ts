import { Page, Locator } from '@playwright/test';

export class NavigationComponent {
  private readonly page: Page;
  private readonly homeLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.homeLink = page.getByText('Home').first();
  }

  async clickHome(): Promise<void> {
    await this.homeLink.click();
  }
}
