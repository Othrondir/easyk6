import { BasePage } from './BasePage.js';
import { ROUTES } from '../utils/constants.js';

export class PostsPage extends BasePage {
  constructor(baseUrl) {
    super(baseUrl);
    this.route = ROUTES.POSTS;
  }

  load() {
    return this.get(this.route);
  }

  verifyPostsArchive(response) {
    return this.checkContains(response, 'Posts');
  }

  verifyHasPosts(response) {
    return this.checkContains(response, 'The King is Dead');
  }
}
