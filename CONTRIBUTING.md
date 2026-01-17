# Contributing to EasyK6

Thank you for your interest in contributing to EasyK6! This document provides guidelines and instructions for contributing to this project.

## How to Contribute

### Reporting Issues

If you find a bug or have a suggestion for improvement:

1. Check if the issue already exists in the GitHub Issues
2. If not, create a new issue with a clear title and description
3. Include steps to reproduce (for bugs)
4. Provide your environment details (K6 version, OS, etc.)

### Submitting Changes

1. **Fork the Repository**
   ```bash
   git clone https://github.com/yourusername/easyk6.git
   cd easyk6
   ```

2. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Your Changes**
   - Follow the coding standards below
   - Add tests if applicable
   - Update documentation if needed

4. **Test Your Changes**
   ```bash
   k6 run tests/smoke/basic-smoke.test.js
   ```

5. **Commit Your Changes**
   ```bash
   git add .
   git commit -m "Add: Brief description of your changes"
   ```

6. **Push to Your Fork**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request**
   - Go to the original repository
   - Click "New Pull Request"
   - Provide a clear description of your changes

## Coding Standards

### File Organization

- **Page Objects**: Place in `pages/` directory
- **Tests**: Organize by type in `tests/smoke/`, `tests/load/`, `tests/api/`
- **Utilities**: Add to `utils/` directory
- **Configuration**: Place in `config/` directory

### Naming Conventions

- **Classes**: Use PascalCase (e.g., `HomePage`, `LoginPage`)
- **Functions**: Use camelCase (e.g., `checkResponse`, `verifyTitle`)
- **Constants**: Use UPPER_SNAKE_CASE (e.g., `BASE_URL`, `STATUS_CODES`)
- **Files**: Match the class name (e.g., `HomePage.js` for `HomePage` class)

### Code Style

- Use ES6+ syntax
- Include JSDoc comments for complex functions
- Keep functions small and focused
- Use meaningful variable names
- Add comments for non-obvious logic

### Example Page Object

```javascript
import { BasePage } from './BasePage.js';
import { ROUTES, STATUS_CODES } from '../utils/constants.js';

/**
 * Page object representing the User Dashboard
 */
export class DashboardPage extends BasePage {
  constructor(baseUrl) {
    super(baseUrl);
    this.route = ROUTES.DASHBOARD;
  }

  /**
   * Load the dashboard page
   * @returns {Object} HTTP response
   */
  load() {
    return this.get(this.route);
  }

  /**
   * Verify dashboard loaded successfully
   * @param {Object} response - HTTP response object
   * @returns {boolean} Verification result
   */
  verifyDashboardLoaded(response) {
    this.checkStatus(response, STATUS_CODES.OK);
    return this.checkContains(response, 'Welcome');
  }
}
```

### Example Test

```javascript
import { sleep } from 'k6';
import { DashboardPage } from '../../pages/DashboardPage.js';
import { checkResponse } from '../../utils/helpers.js';

export const options = {
  vus: 10,
  duration: '1m',
};

export default function () {
  const dashboard = new DashboardPage();

  // Load dashboard
  const response = dashboard.load();

  // Verify response
  checkResponse(response, 200, 'Dashboard');
  dashboard.verifyDashboardLoaded(response);

  // Simulate user think time
  sleep(1);
}
```

## Documentation

When adding new features:

1. Update the README.md with usage examples
2. Add inline comments for complex logic
3. Include JSDoc comments for public methods
4. Update this CONTRIBUTING.md if changing contribution process

## Testing Guidelines

### Before Submitting

1. Run smoke tests to ensure basic functionality
2. Test with different VU counts
3. Verify thresholds are met
4. Check for console errors

### Test Checklist

- [ ] Tests pass with 1 VU
- [ ] Tests pass with multiple VUs
- [ ] No hardcoded credentials or sensitive data
- [ ] Proper error handling
- [ ] Realistic sleep times included
- [ ] Thresholds are appropriate

## Pull Request Guidelines

### PR Title Format

Use one of these prefixes:

- `Add:` New feature or page object
- `Fix:` Bug fix
- `Update:` Modification to existing feature
- `Docs:` Documentation changes
- `Refactor:` Code refactoring
- `Test:` Adding or modifying tests

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] New feature
- [ ] Bug fix
- [ ] Documentation update
- [ ] Refactoring

## Testing
- [ ] Smoke tests pass
- [ ] Load tests pass
- [ ] No new warnings or errors

## Related Issues
Fixes #issue_number
```

## Code Review Process

1. At least one maintainer must review
2. All comments must be addressed
3. CI checks must pass
4. No merge conflicts

## Questions?

Feel free to open an issue with the "question" label or reach out to the maintainers.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
