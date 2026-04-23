import { BasePage } from './BasePage.js';
import { ROUTES } from '../utils/constants.js';

export class AboutPage extends BasePage {
  constructor(baseUrl) {
    super(baseUrl);
    this.route = ROUTES.ABOUT;
  }

  load() {
    return this.get(this.route);
  }

  verifyAboutContent(response) {
    return this.checkContains(response, 'About');
  }

  verifySocialLinks(response) {
    const hasLinkedIn = this.checkContains(response, 'linkedin');
    const hasGitHub = this.checkContains(response, 'github');
    return hasLinkedIn && hasGitHub;
  }
}
