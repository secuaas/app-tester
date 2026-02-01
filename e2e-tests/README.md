# TestForge E2E Tests

End-to-end tests for TestForge using Playwright.

## Setup

```bash
npm install
npx playwright install --with-deps
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in headed mode (visible browser)
npm run test:headed

# Run tests in UI mode (interactive)
npm run test:ui

# Show test report
npm run test:report

# Generate test code
npm run test:codegen
```

## Test Structure

```
tests/
├── auth.spec.ts           # Authentication flow tests
├── dashboard.spec.ts      # Dashboard functionality tests
└── applications.spec.ts   # Application management tests
```

## Test Coverage

### Authentication (`auth.spec.ts`)
- ✅ Display login page
- ✅ Show demo credentials
- ✅ Validate empty form
- ✅ Show error for invalid credentials
- ✅ Redirect to dashboard after login
- ✅ Store auth token in localStorage
- ✅ Redirect to login when accessing protected routes
- ✅ Logout successfully

### Dashboard (`dashboard.spec.ts`)
- ✅ Display dashboard heading
- ✅ Display statistics cards
- ✅ Navigate to applications
- ✅ Navigate to test suites
- ✅ Navigate to executions
- ✅ Navigate to credentials
- ✅ Display user profile
- ✅ Responsive on mobile

### Applications (`applications.spec.ts`)
- ✅ Navigate to applications page
- ✅ Display create application button
- ✅ Open create application modal
- ✅ Create new application
- ✅ Search applications
- ✅ Display application cards
- ✅ Show health check button

## Configuration

Edit `playwright.config.ts` to configure:
- Base URL
- Browsers to test
- Retries and timeouts
- Screenshots and traces
- CI/CD settings

## CI/CD Integration

Tests run automatically in GitHub Actions on every push and pull request.

Test reports are uploaded as artifacts and viewable in the Actions tab.

## Writing New Tests

1. Create a new file in `tests/` directory
2. Import Playwright test utilities:
   ```typescript
   import { test, expect } from '@playwright/test';
   ```
3. Write test cases:
   ```typescript
   test('should do something', async ({ page }) => {
     await page.goto('/');
     await expect(page.getByText('Hello')).toBeVisible();
   });
   ```

## Best Practices

- Use `data-testid` attributes for stable selectors
- Keep tests independent and isolated
- Use page objects for complex flows
- Test both happy paths and error cases
- Use descriptive test names
- Clean up test data after tests

## Debugging

```bash
# Run with debugger
npx playwright test --debug

# Run specific test
npx playwright test auth.spec.ts

# Run with verbose output
npx playwright test --reporter=line
```

## Troubleshooting

### Tests failing locally
- Ensure backend is running on `http://localhost:3000`
- Ensure frontend is running on `http://localhost:5173`
- Check that test user exists (admin@secuaas.ca)

### Timeout errors
- Increase timeout in `playwright.config.ts`
- Check network conditions
- Verify services are healthy

## License

Proprietary - SecuAAS © 2026
