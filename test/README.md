# Test Directory

This directory contains automated tests for the Auto-Git CLI package.

## Test Structure

```
test/
├── cli.test.mjs           # CLI command tests
├── config.test.mjs        # Configuration module tests
├── utils.test.mjs         # Utility function tests
└── README.md              # This file
```

## Running Tests

### All Tests
```bash
npm test
```

### Specific Test File
```bash
node --test test/cli.test.mjs
```

### With Coverage
```bash
npm run test:coverage
```

## Test Naming Conventions

- Test files: `*.test.mjs` or `*.spec.mjs`
- Test descriptions: Use descriptive names starting with "should"
- Group related tests using `describe` blocks

## Writing Tests

### Example Test Structure

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Feature Name', () => {
  it('should do something specific', () => {
    const result = someFunction();
    assert.strictEqual(result, expectedValue);
  });
});
```

## Test Categories

1. **Unit Tests**: Test individual functions and modules in isolation
2. **Integration Tests**: Test interactions between modules
3. **CLI Tests**: Test command-line interface functionality
4. **Configuration Tests**: Test configuration loading and validation

## CI/CD Integration

Tests are automatically run on:
- Every push to `main` and `develop` branches
- Every pull request
- Multiple OS (Ubuntu, Windows, macOS)
- Multiple Node.js versions (18, 20, 22)

## Coverage

Code coverage reports are generated using c8 and uploaded to Codecov.

Target coverage: 80%+

## Best Practices

- Write tests for all new features
- Keep tests isolated and independent
- Use meaningful test descriptions
- Mock external dependencies when appropriate
- Test both success and error cases
- Keep tests fast and focused
