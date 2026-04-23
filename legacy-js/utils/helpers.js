import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

export const errorRate = new Rate('errors');

export function checkResponse(response, expectedStatus = 200, checkName = 'status check') {
  const result = check(response, {
    [`${checkName}: status is ${expectedStatus}`]: (r) => r.status === expectedStatus,
    [`${checkName}: response time < 2000ms`]: (r) => r.timings.duration < 2000,
    [`${checkName}: has body`]: (r) => r.body && r.body.length > 0,
  });

  errorRate.add(!result);
  return result;
}

export function checkMultipleStatuses(response, statuses = [200, 201], checkName = 'status check') {
  const result = check(response, {
    [`${checkName}: status is valid`]: (r) => statuses.includes(r.status),
    [`${checkName}: response time < 2000ms`]: (r) => r.timings.duration < 2000,
  });

  errorRate.add(!result);
  return result;
}

export function randomSleep(min = 1, max = 3) {
  const duration = Math.random() * (max - min) + min;
  sleep(duration);
}

export function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

export function logResponse(response, label = 'Response') {
  console.log(`${label}:`, {
    status: response.status,
    duration: `${response.timings.duration.toFixed(2)}ms`,
    size: `${(response.body.length / 1024).toFixed(2)}KB`,
  });
}
