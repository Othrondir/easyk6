import { BasePage } from './BasePage.js';
import { ROUTES } from '../utils/constants.js';

export class HomePage extends BasePage {
  constructor(baseUrl) {
    super(baseUrl);
    this.route = ROUTES.HOME;
  }

  load() {
    return this.get(this.route);
  }

  verifyTitle(response) {
    return this.checkContains(response, 'QAbbalah');
  }

  verifyNavigation(response) {
    const checks = [
      this.checkContains(response, 'Posts'),
      this.checkContains(response, 'Categories'),
      this.checkContains(response, 'Tags'),
      this.checkContains(response, 'About'),
    ];
    return checks.every(Boolean);
  }

  clickPosts() {
    return this.get(ROUTES.POSTS);
  }

  clickAbout() {
    return this.get(ROUTES.ABOUT);
  }
}
