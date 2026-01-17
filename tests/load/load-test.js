import { sleep } from 'k6';
import { HomePage } from '../../pages/HomePage.js';
import { PostsPage } from '../../pages/PostsPage.js';
import { AboutPage } from '../../pages/AboutPage.js';
import { checkResponse, randomSleep, getRandomElement } from '../../utils/helpers.js';
import { thresholds } from '../../config/thresholds.js';
import { config } from '../../config/config.js';

export const options = {
  stages: config.scenarios.load.stages,
  thresholds: thresholds.load,
};

export default function () {
  const homePage = new HomePage();
  const postsPage = new PostsPage();
  const aboutPage = new AboutPage();

  // Simulate user behavior
  const pages = [
    { page: homePage, name: 'Home' },
    { page: postsPage, name: 'Posts' },
    { page: aboutPage, name: 'About' },
  ];

  // Random page selection
  const selectedPage = getRandomElement(pages);
  const response = selectedPage.page.load();

  checkResponse(response, 200, `${selectedPage.name} Page`);

  // Random think time
  randomSleep(1, 3);
}

export function handleSummary(data) {
  console.log('Load test finished');
  return {
    'stdout': JSON.stringify({
      metrics: {
        http_req_duration: data.metrics.http_req_duration,
        http_req_failed: data.metrics.http_req_failed,
        http_reqs: data.metrics.http_reqs,
      },
    }, null, 2),
  };
}
