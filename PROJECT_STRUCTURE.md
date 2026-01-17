# EasyK6 Project Structure

This document provides a detailed overview of the project structure and the purpose of each directory and file.

## Directory Structure

```
easyk6/
│
├── config/                         # Configuration files
│   ├── config.js                   # Test scenarios configuration (smoke, load, stress, spike)
│   └── thresholds.js              # Performance thresholds and acceptance criteria
│
├── utils/                          # Utility functions and helpers
│   ├── helpers.js                  # Reusable helper functions for checks and validations
│   └── constants.js               # Global constants (URLs, routes, status codes)
│
├── pages/                          # Page Object Model classes
│   ├── BasePage.js                # Base class with common HTTP methods
│   ├── HomePage.js                # Home page object
│   ├── PostsPage.js               # Posts page object
│   └── AboutPage.js               # About page object
│
├── tests/                          # Test files organized by type
│   ├── smoke/                     # Smoke tests (quick validation)
│   │   └── basic-smoke.test.js   # Basic smoke test example
│   ├── load/                      # Load tests (performance under expected load)
│   │   └── load-test.js          # Load test with ramping VUs
│   └── api/                       # API tests (endpoint validation)
│       └── api-test.js            # API endpoint testing
│
├── examples/                       # Example test scripts
│   ├── simple-http.js             # Basic HTTP request example
│   ├── api-example.js             # API testing example
│   └── advanced-scenario.js       # Advanced multi-scenario test
│
├── .gitignore                     # Git ignore rules
├── package.json                   # NPM package configuration
├── README.md                      # Main documentation
├── CONTRIBUTING.md                # Contribution guidelines
└── PROJECT_STRUCTURE.md           # This file
```

## File Descriptions

### Configuration Files

#### `config/config.js`
Contains configuration for different test scenarios:
- **Smoke test**: 1 VU for 30 seconds
- **Load test**: Ramping from 0 to 10 VUs over 5 minutes
- **Stress test**: Ramping up to 100 VUs to find breaking points
- **Spike test**: Rapid increase to 100 VUs to test elasticity
- **HTTP settings**: Default timeout and headers

#### `config/thresholds.js`
Defines performance acceptance criteria:
- Response time thresholds (p95, p99)
- Error rate limits
- Request rate requirements
- Scenario-specific thresholds

### Utility Files

#### `utils/helpers.js`
Reusable helper functions:
- `checkResponse()`: Comprehensive response validation
- `checkMultipleStatuses()`: Validate multiple acceptable status codes
- `randomSleep()`: Simulate realistic user think time
- `getRandomElement()`: Random array selection
- `logResponse()`: Structured response logging
- `errorRate`: Custom metric for error tracking

#### `utils/constants.js`
Global constants:
- `BASE_URL`: Target application URL
- `ROUTES`: Application routes/endpoints
- `STATUS_CODES`: HTTP status code constants
- `SLEEP_DURATION`: Predefined sleep durations

### Page Objects

#### `pages/BasePage.js`
**Purpose**: Base class for all page objects

**Methods**:
- `get(endpoint, params)`: HTTP GET request
- `post(endpoint, body, params)`: HTTP POST request
- `put(endpoint, body, params)`: HTTP PUT request
- `delete(endpoint, params)`: HTTP DELETE request
- `buildUrl(endpoint)`: Construct full URL
- `mergeParams(params)`: Merge default and custom parameters
- `checkStatus(response, expectedStatus)`: Validate status code
- `checkResponseTime(response, maxDuration)`: Validate response time
- `checkContains(response, text)`: Check body content

#### `pages/HomePage.js`
**Purpose**: Represents the home page

**Methods**:
- `load()`: Load the home page
- `verifyTitle(response)`: Verify page title
- `verifyNavigation(response)`: Verify navigation elements
- `clickPosts()`: Navigate to posts
- `clickAbout()`: Navigate to about page

#### `pages/PostsPage.js`
**Purpose**: Represents the posts archive page

**Methods**:
- `load()`: Load the posts page
- `verifyPostsArchive(response)`: Verify posts archive content
- `verifyHasPosts(response)`: Verify posts are displayed

#### `pages/AboutPage.js`
**Purpose**: Represents the about page

**Methods**:
- `load()`: Load the about page
- `verifyAboutContent(response)`: Verify about content
- `verifySocialLinks(response)`: Verify social media links

### Test Files

#### `tests/smoke/basic-smoke.test.js`
**Purpose**: Quick validation that critical paths work

**Configuration**:
- 1 Virtual User (VU)
- 30 seconds duration
- Tests home, posts, and about pages

#### `tests/load/load-test.js`
**Purpose**: Assess performance under expected load

**Configuration**:
- Ramping VUs (0 → 10 → 0)
- 5 minutes total duration
- Random page selection
- Realistic think times

#### `tests/api/api-test.js`
**Purpose**: Validate API endpoints

**Configuration**:
- 5 Virtual Users
- 1 minute duration
- Tests all endpoints
- Strict response time thresholds

### Examples

#### `examples/simple-http.js`
**Purpose**: Basic HTTP request example for beginners

**Features**:
- Simple GET request
- Basic checks
- Minimal configuration

#### `examples/api-example.js`
**Purpose**: API testing example

**Features**:
- Multiple endpoints
- Ramping load
- Endpoint-specific checks

#### `examples/advanced-scenario.js`
**Purpose**: Advanced multi-scenario test

**Features**:
- Multiple concurrent scenarios
- Custom metrics
- Weighted endpoint selection
- Setup and teardown functions
- Custom summary handler
- Tags for filtering results

## Adding New Components

### Adding a New Page Object

1. Create file in `pages/` directory
2. Extend `BasePage` class
3. Add page-specific methods
4. Use in tests

Example:
```javascript
// pages/LoginPage.js
import { BasePage } from './BasePage.js';

export class LoginPage extends BasePage {
  constructor(baseUrl) {
    super(baseUrl);
    this.route = '/login';
  }

  login(username, password) {
    // Implementation
  }
}
```

### Adding a New Test

1. Create file in appropriate `tests/` subdirectory
2. Import required page objects
3. Define test options
4. Implement test logic

Example:
```javascript
// tests/smoke/login-smoke.test.js
import { LoginPage } from '../../pages/LoginPage.js';

export const options = {
  vus: 1,
  duration: '30s',
};

export default function () {
  const loginPage = new LoginPage();
  // Test implementation
}
```

### Adding a New Helper

1. Add function to `utils/helpers.js`
2. Export the function
3. Import in tests where needed

Example:
```javascript
// utils/helpers.js
export function customHelper(param) {
  // Implementation
}
```

## Best Practices

1. **Keep page objects focused**: One page/endpoint per file
2. **Use descriptive names**: Make purpose clear from filename
3. **Follow naming conventions**: PascalCase for classes, camelCase for functions
4. **Organize by test type**: Keep smoke, load, and stress tests separate
5. **Reuse components**: Leverage helpers and base classes
6. **Document complex logic**: Add comments for clarity
7. **Maintain constants**: Update `constants.js` for new routes/URLs

## Related Documentation

- [README.md](README.md) - Main project documentation
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines
- [K6 Documentation](https://k6.io/docs/) - Official K6 docs
