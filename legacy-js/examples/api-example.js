import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 10 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<300'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const baseUrl = 'https://othrondir.github.io/QAbbalah';

  // Test multiple endpoints
  const endpoints = [
    '/',
    '/year-archive/',
    '/categories/',
    '/tags/',
    '/about/',
    '/feed.xml',
  ];

  endpoints.forEach((endpoint) => {
    const response = http.get(`${baseUrl}${endpoint}`);

    check(response, {
      [`${endpoint} - status is 200`]: (r) => r.status === 200,
      [`${endpoint} - response time OK`]: (r) => r.timings.duration < 1000,
    });

    sleep(0.5);
  });

  sleep(1);
}
