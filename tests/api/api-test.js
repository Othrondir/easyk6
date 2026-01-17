import { sleep } from 'k6';
import { BasePage } from '../../pages/BasePage.js';
import { checkResponse } from '../../utils/helpers.js';
import { ROUTES, STATUS_CODES } from '../../utils/constants.js';
import { thresholds } from '../../config/thresholds.js';

export const options = {
  vus: 5,
  duration: '1m',
  thresholds: thresholds.api,
};

export default function () {
  const api = new BasePage();

  // Test all API endpoints
  const endpoints = [
    { path: ROUTES.HOME, name: 'Home' },
    { path: ROUTES.POSTS, name: 'Posts' },
    { path: ROUTES.CATEGORIES, name: 'Categories' },
    { path: ROUTES.TAGS, name: 'Tags' },
    { path: ROUTES.ABOUT, name: 'About' },
    { path: ROUTES.FEED, name: 'RSS Feed' },
  ];

  endpoints.forEach(endpoint => {
    const response = api.get(endpoint.path);

    checkResponse(response, STATUS_CODES.OK, `API ${endpoint.name}`);

    // Additional checks
    api.checkResponseTime(response, 500);

    sleep(0.5);
  });

  sleep(1);
}

export function handleSummary(data) {
  const passed = data.metrics.http_req_failed.values.rate === 0;

  console.log(`API Test ${passed ? 'PASSED' : 'FAILED'}`);

  return {
    'stdout': JSON.stringify({
      status: passed ? 'PASSED' : 'FAILED',
      metrics: {
        requests: data.metrics.http_reqs.values.count,
        failures: data.metrics.http_req_failed.values.rate,
        avg_duration: data.metrics.http_req_duration.values.avg,
        p95_duration: data.metrics.http_req_duration.values['p(95)'],
      },
    }, null, 2),
  };
}
