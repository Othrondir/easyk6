import { sleep } from 'k6';
import { HomePage } from '../../pages/HomePage.js';
import { PostsPage } from '../../pages/PostsPage.js';
import { AboutPage } from '../../pages/AboutPage.js';
import { checkResponse } from '../../utils/helpers.js';
import { thresholds } from '../../config/thresholds.js';

export const options = {
  vus: 1,
  duration: '30s',
  thresholds: thresholds.smoke,
};

export default function () {
  const homePage = new HomePage();
  const postsPage = new PostsPage();
  const aboutPage = new AboutPage();

  // Test Home Page
  const homeResponse = homePage.load();
  checkResponse(homeResponse, 200, 'Home Page');
  homePage.verifyTitle(homeResponse);
  homePage.verifyNavigation(homeResponse);

  sleep(1);

  // Test Posts Page
  const postsResponse = postsPage.load();
  checkResponse(postsResponse, 200, 'Posts Page');
  postsPage.verifyPostsArchive(postsResponse);

  sleep(1);

  // Test About Page
  const aboutResponse = aboutPage.load();
  checkResponse(aboutResponse, 200, 'About Page');
  aboutPage.verifyAboutContent(aboutResponse);

  sleep(1);
}

export function handleSummary(data) {
  return {
    'stdout': JSON.stringify(data, null, 2),
  };
}
