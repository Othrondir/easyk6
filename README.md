# EasyK6 - K6 Performance Testing Framework with POM Architecture

[![K6](https://img.shields.io/badge/k6-v1.5.0-7D64FF?style=flat&logo=k6&logoColor=white)](https://k6.io/)
[![Node.js](https://img.shields.io/badge/Node.js-v22.x-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=flat&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A comprehensive K6 performance testing framework implementing the **Page Object Model (POM)** pattern for better test organization, code reusability, and long-term maintenance. This framework provides a scalable architecture for HTTP, API, and performance testing with built-in examples and best practices.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Running Tests](#running-tests)
- [Understanding the Architecture](#understanding-the-architecture)
  - [Page Object Model (POM)](#page-object-model-pom)
  - [Base Page Class](#base-page-class)
  - [Configuration Management](#configuration-management)
  - [Utility Helpers](#utility-helpers)
- [Creating Your Own Tests](#creating-your-own-tests)
- [Configuration](#configuration)
- [Examples](#examples)
- [Test Types Explained](#test-types-explained)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)
- [Resources](#resources)
- [Tool Versions](#tool-versions)

## Overview

**EasyK6** is a production-ready performance testing framework built on top of [K6](https://k6.io/), designed to help QA engineers and developers create maintainable, scalable performance tests. By implementing the Page Object Model pattern, commonly used in UI automation, this framework brings structure and organization to performance testing.

### Why EasyK6?

- **Maintainability**: Centralized page/API interactions make updates easier
- **Reusability**: Write once, use across multiple tests
- **Scalability**: Easy to extend with new pages and test scenarios
- **Readability**: Clean separation between test logic and implementation details
- **Best Practices**: Built-in patterns for performance testing

## Features

- **POM Architecture**: Clean separation of test logic and page interactions using object-oriented principles
- **Reusable Components**: Base classes and helper functions for common operations
- **Multiple Test Types**: Pre-configured Smoke, Load, Stress, Spike, and API test scenarios
- **Centralized Configuration**: Easy-to-manage scenarios, thresholds, and environment settings
- **Easy to Extend**: Simple, intuitive structure to add new pages and tests
- **Real-world Examples**: Practical tests against a live demo application
- **Performance Metrics**: Built-in error tracking and custom metrics
- **Validation Helpers**: Pre-built assertion functions for common checks
- **Customizable Thresholds**: Flexible performance criteria for different test types

## Prerequisites

Before you begin, ensure you have the following installed:

### Required Tools

| Tool | Minimum Version | Recommended Version | Purpose |
|------|----------------|---------------------|---------|
| [K6](https://k6.io/docs/getting-started/installation/) | 1.0.0 | **1.5.0** | Performance testing engine |
| [Node.js](https://nodejs.org/) | 18.0.0 | **22.x** | Package management (optional) |
| [npm](https://www.npmjs.com/) | 9.0.0 | **11.x** | Script execution (optional) |

### Verify Installation

```bash
# Check k6 version
k6 version

# Check Node.js version (optional)
node --version

# Check npm version (optional)
npm --version
```

### Installing K6

**Windows (using winget - recommended):**
```bash
winget install GrafanaLabs.k6
```

**Windows (using Chocolatey):**
```bash
choco install k6
```

**macOS:**
```bash
brew install k6
```

**Linux (Debian/Ubuntu):**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**Docker:**
```bash
docker pull grafana/k6
```

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/easyk6.git
cd easyk6
```

2. (Optional) Install npm dependencies:
```bash
npm install
```

**Note**: For a faster start, check out the [Quick Start Guide](QUICKSTART.md).

## Project Structure

```
easyk6/
├── config/
│   ├── config.js               # Test scenarios configuration
│   └── thresholds.js           # Performance thresholds
├── utils/
│   ├── helpers.js              # Utility functions
│   └── constants.js            # Global constants
├── pages/
│   ├── BasePage.js             # Base page class
│   ├── HomePage.js             # Home page object
│   ├── PostsPage.js            # Posts page object
│   └── AboutPage.js            # About page object
├── tests/
│   ├── smoke/
│   │   └── basic-smoke.test.js # Smoke test example
│   ├── load/
│   │   └── load-test.js        # Load test example
│   └── api/
│       └── api-test.js         # API test example
├── examples/
│   ├── simple-http.js          # Basic HTTP test
│   ├── api-example.js          # API testing example
│   └── advanced-scenario.js    # Advanced multi-scenario test
├── package.json                # NPM configuration
├── .gitignore                  # Git ignore rules
├── README.md                   # Main documentation (you are here)
├── QUICKSTART.md               # Quick start guide
├── CONTRIBUTING.md             # Contribution guidelines
└── PROJECT_STRUCTURE.md        # Detailed project structure
```

For detailed information about each file, see [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md).

## Quick Start

Run a simple smoke test:

```bash
k6 run tests/smoke/basic-smoke.test.js
```

Run a load test:

```bash
k6 run tests/load/load-test.js
```

Run an API test:

```bash
k6 run tests/api/api-test.js
```

## Running Tests

### Using K6 Directly

```bash
# Smoke test
k6 run tests/smoke/basic-smoke.test.js

# Load test
k6 run tests/load/load-test.js

# API test
k6 run tests/api/api-test.js

# Simple HTTP example
k6 run examples/simple-http.js

# API example
k6 run examples/api-example.js

# Advanced multi-scenario example
k6 run examples/advanced-scenario.js
```

### Using NPM Scripts

```bash
# Smoke test
npm run test:smoke

# Load test
npm run test:load

# API test
npm run test:api

# HTTP example
npm run example:http

# API example
npm run example:api

# Advanced scenario example
npm run example:advanced
```

### Advanced Options

```bash
# Run with custom VUs and duration
k6 run --vus 10 --duration 60s tests/smoke/basic-smoke.test.js

# Run with custom stages
k6 run --stage 30s:10,1m:20,30s:0 tests/load/load-test.js

# Generate HTML report
k6 run --out json=results.json tests/api/api-test.js
```

## Understanding the Architecture

### Page Object Model (POM)

#### What is POM?

The Page Object Model is a design pattern that creates an object repository for web/API elements. Each page/endpoint is represented by a class, encapsulating the structure and behavior of that page.

**Benefits:**
- **Separation of Concerns**: Test logic is separate from page structure
- **DRY Principle**: Avoid duplicating selectors and HTTP requests
- **Easy Maintenance**: Changes to a page only require updates in one place
- **Improved Readability**: Tests read like user stories
- **Reusability**: Page objects can be used across multiple test scenarios

#### POM in Performance Testing

While POM is traditionally used in UI automation (Selenium, Playwright), it's equally powerful for API and performance testing:

- **Page Objects** = API Endpoints or Web Pages
- **Methods** = HTTP Requests (GET, POST, PUT, DELETE)
- **Validations** = Response checks and assertions
- **Properties** = Routes, URLs, and configuration

### Creating a New Page Object

1. Create a new file in `pages/` directory:

```javascript
// pages/NewPage.js
import { BasePage } from './BasePage.js';
import { ROUTES } from '../utils/constants.js';

export class NewPage extends BasePage {
  constructor(baseUrl) {
    super(baseUrl);
    this.route = '/new-route/';
  }

  load() {
    return this.get(this.route);
  }

  verifyContent(response) {
    return this.checkContains(response, 'Expected Content');
  }

  performAction() {
    return this.post(this.route, { key: 'value' });
  }
}
```

2. Use it in your tests:

```javascript
import { NewPage } from '../pages/NewPage.js';

export default function () {
  const newPage = new NewPage();
  const response = newPage.load();
  newPage.verifyContent(response);
}
```

### Base Page Class

The `BasePage` class is the foundation of the framework. It provides common HTTP methods and validation functions that all page objects inherit.

#### HTTP Methods

| Method | Parameters | Description |
|--------|------------|-------------|
| `get(endpoint, params)` | endpoint, optional params | Performs HTTP GET request |
| `post(endpoint, body, params)` | endpoint, body, optional params | Performs HTTP POST request |
| `put(endpoint, body, params)` | endpoint, body, optional params | Performs HTTP PUT request |
| `delete(endpoint, params)` | endpoint, optional params | Performs HTTP DELETE request |

#### Validation Methods

| Method | Parameters | Description |
|--------|------------|-------------|
| `checkStatus(response, expectedStatus)` | response, expected status code | Validates HTTP status code |
| `checkResponseTime(response, maxDuration)` | response, max milliseconds | Validates response time threshold |
| `checkContains(response, text)` | response, text to find | Checks if response body contains text |

#### Utility Methods

| Method | Parameters | Description |
|--------|------------|-------------|
| `buildUrl(endpoint)` | endpoint path | Constructs full URL from base + path |
| `mergeParams(params)` | custom parameters | Merges default and custom HTTP params |

### Configuration Management

The framework uses centralized configuration files for better maintainability:

#### `config/config.js`
Contains test scenario configurations including:
- Virtual users (VUs) settings
- Test duration and stages
- Executor types (constant-vus, ramping-vus, etc.)
- HTTP default settings

#### `config/thresholds.js`
Defines performance acceptance criteria:
- Response time percentiles (p95, p99)
- Error rate limits
- Request rate requirements
- Custom metrics thresholds

### Utility Helpers

The `utils/helpers.js` file provides reusable functions:

- **`checkResponse()`**: Comprehensive response validation
- **`checkMultipleStatuses()`**: Validate against multiple acceptable status codes
- **`randomSleep()`**: Simulate realistic user think time
- **`getRandomElement()`**: Random selection from arrays
- **`logResponse()`**: Structured response logging
- **`errorRate`**: Custom metric for tracking errors

## Creating Your Own Tests

### Step 1: Define Constants

Add your application URLs and routes to `utils/constants.js`:

```javascript
export const BASE_URL = 'https://your-application.com';

export const ROUTES = {
  HOME: '/',
  LOGIN: '/auth/login',
  DASHBOARD: '/dashboard',
  API_USERS: '/api/v1/users',
};
```

### Step 2: Create Page Objects

Create a new page object in the `pages/` directory:

```javascript
// pages/LoginPage.js
import { BasePage } from './BasePage.js';
import { ROUTES, STATUS_CODES } from '../utils/constants.js';

export class LoginPage extends BasePage {
  constructor(baseUrl) {
    super(baseUrl);
    this.route = ROUTES.LOGIN;
  }

  login(username, password) {
    const payload = JSON.stringify({
      username: username,
      password: password
    });

    const params = {
      headers: { 'Content-Type': 'application/json' }
    };

    return this.post(this.route, payload, params);
  }

  verifySuccessfulLogin(response) {
    this.checkStatus(response, STATUS_CODES.OK);
    this.checkResponseTime(response, 500);
    return this.checkContains(response, 'token');
  }
}
```

### Step 3: Write Your Test

Create a test file using your page objects:

```javascript
// tests/smoke/login-smoke.test.js
import { sleep } from 'k6';
import { LoginPage } from '../../pages/LoginPage.js';
import { checkResponse } from '../../utils/helpers.js';

export const options = {
  vus: 1,
  duration: '30s',
};

export default function () {
  const loginPage = new LoginPage();

  // Perform login
  const response = loginPage.login('testuser', 'password123');

  // Validate response
  checkResponse(response, 200, 'Login');
  loginPage.verifySuccessfulLogin(response);

  sleep(1);
}
```

### Step 4: Run Your Test

```bash
k6 run tests/smoke/login-smoke.test.js
```

## Configuration

### Test Scenarios

Edit `config/config.js` to modify test scenarios:

```javascript
scenarios: {
  smoke: {
    executor: 'constant-vus',
    vus: 1,
    duration: '30s',
  },
  load: {
    executor: 'ramping-vus',
    stages: [
      { duration: '1m', target: 10 },
      { duration: '3m', target: 10 },
      { duration: '1m', target: 0 },
    ],
  },
}
```

### Thresholds

Edit `config/thresholds.js` to set performance criteria:

```javascript
load: {
  http_req_duration: ['p(95)<500', 'p(99)<1000'],
  http_req_failed: ['rate<0.01'],
  http_reqs: ['rate>50'],
}
```

### Constants

Edit `utils/constants.js` to update URLs and routes:

```javascript
export const BASE_URL = 'https://your-app.com';

export const ROUTES = {
  HOME: '/',
  API_USERS: '/api/users',
  API_POSTS: '/api/posts',
};
```

## Examples

### Simple HTTP Test

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export default function () {
  const response = http.get('https://othrondir.github.io/QAbbalah/');

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

### Using Page Objects

```javascript
import { HomePage } from '../pages/HomePage.js';
import { checkResponse } from '../utils/helpers.js';

export default function () {
  const homePage = new HomePage();
  const response = homePage.load();

  checkResponse(response, 200, 'Home Page');
  homePage.verifyTitle(response);
  homePage.verifyNavigation(response);
}
```

### API Testing

```javascript
import { BasePage } from '../pages/BasePage.js';
import { STATUS_CODES } from '../utils/constants.js';

export default function () {
  const api = new BasePage();

  const response = api.get('/api/endpoint');
  api.checkStatus(response, STATUS_CODES.OK);
  api.checkResponseTime(response, 300);
}
```

## Test Types Explained

### Smoke Tests

**Purpose**: Quick validation that the system is functional

**Characteristics**:
- Minimal load (1 VU)
- Short duration (30s - 1min)
- Tests critical paths only
- Fast feedback

**When to use**: Before running more intensive tests, after deployments, in CI/CD pipelines

**Example**:
```bash
k6 run tests/smoke/basic-smoke.test.js
```

### Load Tests

**Purpose**: Assess system performance under expected load

**Characteristics**:
- Gradual ramp-up of users
- Sustained load period
- Realistic user scenarios
- Performance baseline

**When to use**: Regular performance testing, establishing baselines, capacity planning

**Example**:
```bash
k6 run tests/load/load-test.js
```

### Stress Tests

**Purpose**: Determine system limits and breaking points

**Characteristics**:
- High user count
- Longer duration
- Gradual increase to failure
- Recovery testing

**When to use**: Finding system limits, testing auto-scaling, disaster recovery planning

### Spike Tests

**Purpose**: Test system response to sudden traffic increases

**Characteristics**:
- Rapid increase in load
- Short high-load period
- Quick ramp-down
- Tests elasticity

**When to use**: Flash sales, viral content, DDoS preparation

### API Tests

**Purpose**: Validate API endpoints performance and reliability

**Characteristics**:
- Endpoint-specific testing
- Response validation
- Contract testing
- Integration verification

**When to use**: API development, microservices testing, integration testing

**Example**:
```bash
k6 run tests/api/api-test.js
```

## Best Practices

### Code Organization

1. **Organize Tests by Type**: Keep smoke, load, and stress tests in separate directories
2. **One Page Object per File**: Each page/endpoint should have its own file
3. **Use Descriptive Names**: Name files and functions clearly (e.g., `LoginPage.js`, `verifySuccessfulLogin()`)
4. **Follow Naming Conventions**: Use PascalCase for classes, camelCase for functions

### Configuration Management

5. **Use Constants**: Define all URLs and routes in `utils/constants.js`
6. **Centralize Configuration**: Keep scenarios and thresholds in config files
7. **Environment Variables**: Use environment variables for sensitive data
8. **Version Control**: Commit configuration files but not credentials

### Test Design

9. **Realistic Scenarios**: Simulate actual user behavior
10. **Add Sleep Times**: Include think time between requests
11. **Random Data**: Use random selections to avoid caching effects
12. **Error Handling**: Always validate responses and handle errors

### Performance

13. **Set Appropriate Thresholds**: Define realistic performance criteria based on SLAs
14. **Monitor Metrics**: Track response times, error rates, and throughput
15. **Incremental Testing**: Start with smoke tests before running load tests
16. **Baseline First**: Establish performance baselines before optimization

### Maintenance

17. **Reuse Components**: Leverage utility functions from `utils/helpers.js`
18. **Use Page Objects**: Keep test logic separate from page interactions
19. **Document Changes**: Update README when adding new features
20. **Review Regularly**: Periodically review and update tests

### CI/CD Integration

21. **Automate Tests**: Run smoke tests on every deployment
22. **Schedule Load Tests**: Run load tests on a regular schedule
23. **Set Exit Criteria**: Use thresholds to fail builds on poor performance
24. **Archive Results**: Store test results for trend analysis

## Troubleshooting

### Common Issues

#### Tests Fail with "Connection Refused"

**Cause**: Target application is not accessible

**Solution**:
- Verify the URL in `utils/constants.js`
- Check if the application is running
- Verify network connectivity
- Check firewall rules

#### High Error Rates

**Cause**: Server cannot handle the load or requests are malformed

**Solution**:
- Reduce virtual users (VUs)
- Increase ramp-up time
- Verify request payloads
- Check server logs
- Review authentication/headers

#### Thresholds Failing

**Cause**: Performance doesn't meet defined criteria

**Solution**:
- Review threshold values in `config/thresholds.js`
- Analyze specific metrics that are failing
- Optimize application performance
- Adjust thresholds if they're unrealistic

#### Module Import Errors

**Cause**: Incorrect file paths or missing files

**Solution**:
- Verify file paths use correct relative paths
- Ensure all `.js` extensions are included in imports
- Check for typos in file names

#### Inconsistent Results

**Cause**: External factors affecting tests

**Solution**:
- Run tests multiple times to establish patterns
- Check for caching issues
- Verify test environment is stable
- Use `randomSleep()` to simulate realistic behavior

### Debugging Tips

1. **Use Console Logs**: Add `console.log()` statements to debug
2. **Check Response Bodies**: Log full responses to see actual data
3. **Reduce VUs**: Start with 1 VU to isolate issues
4. **Shorten Duration**: Use shorter test durations during debugging
5. **Check K6 Docs**: Review [K6 documentation](https://k6.io/docs/) for specific errors

### Getting Help

- Check the [K6 Community Forum](https://community.k6.io/)
- Review [K6 GitHub Issues](https://github.com/grafana/k6/issues)
- Read the [K6 Documentation](https://k6.io/docs/)
- Open an issue in this repository

## Target Application

This framework includes examples testing against [QAbbalah](https://othrondir.github.io/QAbbalah/), a demo blog application with the following endpoints:

- `/` - Home page
- `/year-archive/` - Posts archive
- `/categories/` - Categories listing
- `/tags/` - Tags listing
- `/about/` - About page
- `/feed.xml` - RSS feed

## Additional Documentation

- **[Quick Start Guide](QUICKSTART.md)**: Get started in 5 minutes
- **[Project Structure](PROJECT_STRUCTURE.md)**: Detailed file and directory information
- **[Contributing Guidelines](CONTRIBUTING.md)**: How to contribute to this project

## Contributing

We welcome contributions! Please read our [Contributing Guidelines](CONTRIBUTING.md) for details on:
- Reporting issues
- Submitting pull requests
- Coding standards
- Testing requirements

Feel free to submit issues, fork the repository, and create pull requests for any improvements.

## License

MIT License - feel free to use this framework for your projects.

## Resources

### K6 Resources
- [K6 Official Documentation](https://k6.io/docs/)
- [K6 Examples](https://k6.io/docs/examples/)
- [K6 Community Forum](https://community.k6.io/)
- [K6 GitHub Repository](https://github.com/grafana/k6)

### Performance Testing
- [Performance Testing Guidance](https://k6.io/docs/test-types/introduction/)
- [K6 Best Practices](https://k6.io/docs/testing-guides/automated-performance-testing/)
- [Load Testing Methodology](https://k6.io/docs/testing-guides/load-testing-websites/)

### Design Patterns
- [Page Object Model](https://www.selenium.dev/documentation/test_practices/encouraged/page_object_models/)
- [Test Design Patterns](https://martinfowler.com/articles/practical-test-pyramid.html)

## Support

If you need help or have questions:
- Check the [Quick Start Guide](QUICKSTART.md) for common setup issues
- Review the [Troubleshooting](#troubleshooting) section above
- Search [existing issues](https://github.com/yourusername/easyk6/issues)
- Open a [new issue](https://github.com/yourusername/easyk6/issues/new) with details

## Tool Versions

This project has been tested and verified with the following tool versions:

| Tool | Version | Notes |
|------|---------|-------|
| k6 | 1.5.0 | Grafana k6 performance testing tool |
| Node.js | 22.20.0 | LTS version recommended |
| npm | 11.6.1 | Comes bundled with Node.js |

These versions are also documented in `package.json` under the `toolVersions` field.

To check your current versions:
```bash
k6 version          # Expected: k6 v1.5.0 or higher
node --version      # Expected: v18.0.0 or higher
npm --version       # Expected: 9.0.0 or higher
```

## Acknowledgments

- Built with [K6](https://k6.io/) by Grafana Labs
- Inspired by Page Object Model pattern from Selenium community
- Demo application: [QAbbalah](https://othrondir.github.io/QAbbalah/)
