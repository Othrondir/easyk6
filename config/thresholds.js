export const thresholds = {
  // Default thresholds for all tests
  default: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    http_reqs: ['rate>10'],
  },

  // Smoke test thresholds
  smoke: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.01'],
  },

  // Load test thresholds
  load: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    http_reqs: ['rate>50'],
  },

  // Stress test thresholds
  stress: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    http_req_failed: ['rate<0.05'],
  },

  // API specific thresholds
  api: {
    http_req_duration: ['p(95)<300', 'p(99)<500'],
    http_req_failed: ['rate<0.01'],
  },
};
