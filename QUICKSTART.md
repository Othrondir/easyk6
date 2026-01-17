# Quick Start Guide

Get started with EasyK6 in 5 minutes!

## Prerequisites

Install K6 if you haven't already:

**Windows (with Chocolatey):**
```bash
choco install k6
```

**macOS (with Homebrew):**
```bash
brew install k6
```

**Linux:**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

## Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/easyk6.git
cd easyk6
```

## Step 2: Run Your First Test

Run a simple smoke test:

```bash
k6 run tests/smoke/basic-smoke.test.js
```

You should see output similar to:

```
     ✓ Home Page: status is 200
     ✓ Home Page: response time < 2000ms
     ✓ Home Page: has body

     checks.........................: 100.00% ✓ 9       ✗ 0
     data_received..................: 156 kB  5.2 kB/s
     data_sent......................: 1.2 kB  40 B/s
     http_req_duration..............: avg=245ms min=198ms med=234ms max=312ms p(90)=298ms p(95)=305ms
     http_reqs......................: 3       0.1/s
```

## Step 3: Try Different Test Types

### Simple HTTP Example
```bash
k6 run examples/simple-http.js
```

### Load Test
```bash
k6 run tests/load/load-test.js
```

### API Test
```bash
k6 run tests/api/api-test.js
```

### Advanced Multi-Scenario
```bash
k6 run examples/advanced-scenario.js
```

## Step 4: Understand the Results

### Key Metrics

- **checks**: Percentage of successful assertions
- **http_req_duration**: Response time statistics
- **http_req_failed**: Error rate
- **http_reqs**: Total number of requests
- **vus**: Number of virtual users

### Thresholds

Tests will pass/fail based on thresholds defined in configuration:
- ✅ Pass: All thresholds met
- ❌ Fail: One or more thresholds exceeded

## Step 5: Customize for Your Application

### Update Target URL

Edit `utils/constants.js`:

```javascript
export const BASE_URL = 'https://your-application.com';

export const ROUTES = {
  HOME: '/',
  LOGIN: '/auth/login',
  DASHBOARD: '/dashboard',
  // Add your routes here
};
```

### Create Your First Page Object

Create `pages/YourPage.js`:

```javascript
import { BasePage } from './BasePage.js';
import { ROUTES } from '../utils/constants.js';

export class YourPage extends BasePage {
  constructor(baseUrl) {
    super(baseUrl);
    this.route = ROUTES.YOUR_ROUTE;
  }

  load() {
    return this.get(this.route);
  }

  verifyContent(response) {
    this.checkStatus(response, 200);
    return this.checkContains(response, 'Expected Text');
  }
}
```

### Create Your First Test

Create `tests/smoke/your-smoke.test.js`:

```javascript
import { sleep } from 'k6';
import { YourPage } from '../../pages/YourPage.js';
import { checkResponse } from '../../utils/helpers.js';

export const options = {
  vus: 1,
  duration: '30s',
};

export default function () {
  const yourPage = new YourPage();

  const response = yourPage.load();
  checkResponse(response, 200, 'Your Page');
  yourPage.verifyContent(response);

  sleep(1);
}
```

### Run Your Custom Test

```bash
k6 run tests/smoke/your-smoke.test.js
```

## Common Commands

### Using K6 Directly

```bash
# Run with custom VUs and duration
k6 run --vus 10 --duration 60s tests/smoke/basic-smoke.test.js

# Run with custom stages
k6 run --stage 30s:10,1m:20,30s:0 tests/load/load-test.js

# Output results to JSON
k6 run --out json=results.json tests/api/api-test.js

# Run with environment variables
k6 run -e MY_VAR=value tests/smoke/basic-smoke.test.js
```

### Using NPM Scripts

```bash
npm run test:smoke      # Run smoke tests
npm run test:load       # Run load tests
npm run test:api        # Run API tests
npm run example:http    # Run simple HTTP example
npm run example:api     # Run API example
npm run example:advanced # Run advanced scenario
```

## Next Steps

1. **Explore Examples**: Check out the `examples/` directory for more patterns
2. **Read the Docs**: Review [README.md](README.md) for comprehensive documentation
3. **Check Structure**: See [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) for detailed file organization
4. **Contribute**: Read [CONTRIBUTING.md](CONTRIBUTING.md) to contribute to the project

## Troubleshooting

### Connection Refused
- Verify the URL in `utils/constants.js`
- Check if the target application is accessible

### Module Not Found
- Ensure all file paths use `.js` extension
- Verify imports use correct relative paths

### Thresholds Failing
- Review threshold values in `config/thresholds.js`
- Adjust based on your application's performance

## Tips for Success

1. **Start Small**: Begin with smoke tests before load tests
2. **Set Realistic Thresholds**: Base on actual SLAs and baseline measurements
3. **Use Think Time**: Add `sleep()` to simulate realistic user behavior
4. **Monitor Trends**: Track metrics over time to catch performance regressions
5. **Test in Stages**: Gradually increase load to find breaking points

## Getting Help

- [K6 Documentation](https://k6.io/docs/)
- [K6 Community Forum](https://community.k6.io/)
- [K6 GitHub](https://github.com/grafana/k6)
- [Project Issues](https://github.com/yourusername/easyk6/issues)

Happy Testing!
