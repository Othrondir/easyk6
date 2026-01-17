import http from 'k6/http';
import { sleep, check } from 'k6';
import { Counter, Trend } from 'k6/metrics';

// Custom metrics
const customCounter = new Counter('custom_requests');
const customTrend = new Trend('custom_response_time');

// Advanced test configuration with multiple scenarios
export const options = {
  scenarios: {
    // Constant load scenario
    constant_load: {
      executor: 'constant-vus',
      vus: 10,
      duration: '2m',
      gracefulStop: '30s',
      tags: { scenario: 'constant' },
    },
    // Ramping load scenario
    ramping_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 20 },
        { duration: '2m', target: 20 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
      startTime: '2m',
      tags: { scenario: 'ramping' },
    },
    // Spike test scenario
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 50 },
        { duration: '30s', target: 50 },
        { duration: '10s', target: 0 },
      ],
      startTime: '4m',
      tags: { scenario: 'spike' },
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    'http_req_duration{scenario:constant}': ['p(95)<400'],
    'http_req_duration{scenario:ramping}': ['p(95)<600'],
    'http_req_duration{scenario:spike}': ['p(95)<1000'],
    custom_response_time: ['p(95)<500'],
  },
};

const BASE_URL = 'https://othrondir.github.io/QAbbalah';

// Simulated user data
const endpoints = [
  { path: '/', weight: 50 },
  { path: '/year-archive/', weight: 20 },
  { path: '/categories/', weight: 15 },
  { path: '/tags/', weight: 10 },
  { path: '/about/', weight: 5 },
];

/**
 * Select a random endpoint based on weights
 * @returns {string} Selected endpoint path
 */
function selectWeightedEndpoint() {
  const totalWeight = endpoints.reduce((sum, ep) => sum + ep.weight, 0);
  let random = Math.random() * totalWeight;

  for (const endpoint of endpoints) {
    if (random < endpoint.weight) {
      return endpoint.path;
    }
    random -= endpoint.weight;
  }

  return endpoints[0].path;
}

/**
 * Setup function - runs once before all VUs
 */
export function setup() {
  console.log('Starting advanced performance test');

  // Verify target is accessible
  const response = http.get(BASE_URL);
  if (response.status !== 200) {
    throw new Error('Target application is not accessible');
  }

  return { startTime: Date.now() };
}

/**
 * Main test function - runs for each VU iteration
 */
export default function (data) {
  const endpoint = selectWeightedEndpoint();
  const url = `${BASE_URL}${endpoint}`;

  // Make the request
  const response = http.get(url, {
    tags: { endpoint: endpoint },
    headers: {
      'User-Agent': 'k6-advanced-test',
    },
  });

  // Track custom metrics
  customCounter.add(1);
  customTrend.add(response.timings.duration);

  // Comprehensive checks
  const checkResult = check(response, {
    'status is 200': (r) => r.status === 200,
    'response has body': (r) => r.body && r.body.length > 0,
    'response time < 1000ms': (r) => r.timings.duration < 1000,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'content type is HTML': (r) => r.headers['Content-Type']?.includes('text/html'),
  });

  // Log failures
  if (!checkResult) {
    console.error(`Request to ${endpoint} failed checks`);
  }

  // Realistic user behavior with varying think time
  const thinkTime = Math.random() * 3 + 1; // 1-4 seconds
  sleep(thinkTime);
}

/**
 * Teardown function - runs once after all VUs finish
 */
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`Test completed in ${duration.toFixed(2)} seconds`);
}

/**
 * Custom summary handler
 */
export function handleSummary(data) {
  const scenarios = Object.keys(data.metrics).filter(key =>
    key.includes('scenario')
  );

  console.log('\n=== Performance Test Summary ===');
  console.log(`Total Requests: ${data.metrics.http_reqs?.values.count || 0}`);
  console.log(`Failed Requests: ${(data.metrics.http_req_failed?.values.rate * 100 || 0).toFixed(2)}%`);
  console.log(`Average Response Time: ${(data.metrics.http_req_duration?.values.avg || 0).toFixed(2)}ms`);
  console.log(`p95 Response Time: ${(data.metrics.http_req_duration?.values['p(95)'] || 0).toFixed(2)}ms`);
  console.log(`p99 Response Time: ${(data.metrics.http_req_duration?.values['p(99)'] || 0).toFixed(2)}ms`);

  return {
    'stdout': JSON.stringify(data, null, 2),
    'summary.json': JSON.stringify({
      timestamp: new Date().toISOString(),
      total_requests: data.metrics.http_reqs?.values.count || 0,
      failed_rate: data.metrics.http_req_failed?.values.rate || 0,
      avg_duration: data.metrics.http_req_duration?.values.avg || 0,
      p95_duration: data.metrics.http_req_duration?.values['p(95)'] || 0,
      p99_duration: data.metrics.http_req_duration?.values['p(99)'] || 0,
      custom_counter: data.metrics.custom_requests?.values.count || 0,
    }, null, 2),
  };
}
