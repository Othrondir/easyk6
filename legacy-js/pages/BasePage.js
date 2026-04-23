import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL } from '../utils/constants.js';

export class BasePage {
  constructor(baseUrl = BASE_URL) {
    this.baseUrl = baseUrl;
    this.defaultParams = {
      headers: {
        'User-Agent': 'k6-easyk6-framework',
      },
      timeout: '30s',
    };
  }

  get(endpoint, params = {}) {
    const url = this.buildUrl(endpoint);
    const mergedParams = this.mergeParams(params);
    return http.get(url, mergedParams);
  }

  post(endpoint, body = null, params = {}) {
    const url = this.buildUrl(endpoint);
    const mergedParams = this.mergeParams(params);
    return http.post(url, body, mergedParams);
  }

  put(endpoint, body = null, params = {}) {
    const url = this.buildUrl(endpoint);
    const mergedParams = this.mergeParams(params);
    return http.put(url, body, mergedParams);
  }

  delete(endpoint, params = {}) {
    const url = this.buildUrl(endpoint);
    const mergedParams = this.mergeParams(params);
    return http.del(url, null, mergedParams);
  }

  buildUrl(endpoint) {
    if (endpoint.startsWith('http')) {
      return endpoint;
    }
    const base = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl;
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${base}${path}`;
  }

  mergeParams(params) {
    return {
      ...this.defaultParams,
      ...params,
      headers: {
        ...this.defaultParams.headers,
        ...(params.headers || {}),
      },
    };
  }

  checkStatus(response, expectedStatus = 200) {
    return check(response, {
      [`status is ${expectedStatus}`]: (r) => r.status === expectedStatus,
    });
  }

  checkResponseTime(response, maxDuration = 2000) {
    return check(response, {
      [`response time < ${maxDuration}ms`]: (r) => r.timings.duration < maxDuration,
    });
  }

  checkContains(response, text) {
    return check(response, {
      [`body contains "${text}"`]: (r) => r.body && r.body.includes(text),
    });
  }
}
