# Testing & Quality Assurance Guide

## Overview

This repository implements a comprehensive automated testing and quality assurance system to maintain code quality, reliability, and stability.

## Test Infrastructure

### 1. Automated Testing Workflows

#### Test & Quality Assurance (`test.yml`)
- **Trigger**: Push to `main`/`develop`, Pull Requests
- **Jobs**:
  - Linting & Static Analysis (ESLint, TypeScript)
  - Unit Tests for CLI (Node 18, 20, 22 on Ubuntu, Windows, macOS)
  - Unit Tests for GitCue Extension (Node 18, 20)
  - Integration Tests
  - Code Quality Checks
  - Security Audit
  - Test Report Generation

#### Code Coverage (`coverage.yml`)
- **Trigger**: Push to `main`/`develop`, Pull Requests
- **Features**:
  - Generates coverage reports using c8
  - Uploads to Codecov
  - Comments on PRs with coverage status
  - Supports both CLI and GitCue packages

#### Test Notifications (`notify.yml`)
- **Trigger**: On test workflow completion
- **Features**:
  - Automatic PR comments on test failures
  - Success summaries
  - Links to failed workflow runs

### 2. Dependency Management

#### Dependabot (`dependabot.yml`)
- **Schedules**: Weekly updates on Mondays
- **Monitors**:
  - npm dependencies (CLI package)
  - npm dependencies (GitCue extension)
  - GitHub Actions versions
- **Features**:
  - Automatic PR creation
  - Assignees and reviewers
  - Semantic versioning
  - Grouped updates

## Test Structure

### CLI Package Tests (`/test`)

```
test/
├── cli.test.mjs           # CLI command tests
├── config.test.mjs        # Configuration tests
├── utils.test.mjs         # Utility function tests
└── README.md              # Test documentation
```

### GitCue Extension Tests (`/gitcue/src/test`)

```
gitcue/src/test/
├── extension.test.ts      # Extension activation tests
├── services.test.ts       # Service layer tests
└── README.md              # Test documentation
```

## Running Tests Locally

### CLI Package

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix
```

### GitCue Extension

```bash
cd gitcue

# Install dependencies
npm ci

# Compile TypeScript
npm run compile

# Run tests
npm test

# Run linting
npm run lint

# Type checking
npx tsc --noEmit
```

## Code Quality Standards

### Linting Rules

- **ESLint** for JavaScript/TypeScript code
- **TypeScript** strict type checking
- No unused variables (warning)
- Prefer const over let
- No var declarations

### Code Quality Checks

1. **Console.log Detection**: Warns about console.log usage (prefer logger)
2. **TODO Comments**: Monitors technical debt
3. **File Size**: Checks for oversized files (>100KB)
4. **Security Audit**: npm audit for vulnerabilities

### Coverage Goals

- **Target**: 80%+ code coverage
- **Tools**: c8 for Node.js, built-in for VS Code extension
- **Reporting**: Codecov integration with PR comments

## CI/CD Pipeline

### On Every Push

1. ✅ Dependency validation (circular dependency check)
2. ✅ Linting and static analysis
3. ✅ Unit tests (multi-OS, multi-Node version)
4. ✅ Integration tests
5. ✅ Code quality checks
6. ✅ Security audit
7. ✅ Coverage report generation
8. ✅ Test summary creation

### On Pull Requests

All of the above, plus:
- Coverage comparison
- Automated PR comments with results
- Test failure notifications
- Workflow status badges

### On Test Failures

- Automatic PR comment with failure details
- Link to failed workflow run
- Branch and commit information
- Notification to assignees

## Test Badges

Add these badges to your README.md:

```markdown
![Tests](https://github.com/sbeeredd04/auto-git/actions/workflows/test.yml/badge.svg)
![Coverage](https://github.com/sbeeredd04/auto-git/actions/workflows/coverage.yml/badge.svg)
[![codecov](https://codecov.io/gh/sbeeredd04/auto-git/branch/main/graph/badge.svg)](https://codecov.io/gh/sbeeredd04/auto-git)
```

## Writing Tests

### Best Practices

1. **Descriptive Names**: Use clear, descriptive test names
   ```javascript
   it('should generate AI commit message when API key is valid')
   ```

2. **Arrange-Act-Assert**: Structure tests clearly
   ```javascript
   // Arrange
   const input = 'test data';
   
   // Act
   const result = functionUnderTest(input);
   
   // Assert
   assert.strictEqual(result, expected);
   ```

3. **Isolation**: Tests should be independent
   ```javascript
   // ❌ Bad - depends on external state
   it('should work', () => {
     globalVar = 'test';
     assert.ok(someFunction());
   });
   
   // ✅ Good - self-contained
   it('should work with valid input', () => {
     const input = 'test';
     assert.ok(someFunction(input));
   });
   ```

4. **Error Cases**: Test both success and failure
   ```javascript
   describe('Error Handling', () => {
     it('should throw error with invalid input', () => {
       assert.throws(() => functionUnderTest(null), /Invalid input/);
     });
   });
   ```

### Test Categories

#### Unit Tests
- Test individual functions
- Mock external dependencies
- Fast execution
- High coverage

#### Integration Tests
- Test module interactions
- Use real dependencies when safe
- Validate workflows
- Test CLI commands

#### E2E Tests (Future)
- Full application flow
- Real git operations
- User scenarios

## Continuous Monitoring

### Metrics Tracked

1. **Test Pass Rate**: Should be 100%
2. **Code Coverage**: Target 80%+
3. **Security Vulnerabilities**: Zero high/critical
4. **Build Time**: Monitor for performance
5. **Dependency Freshness**: Weekly updates

### Health Indicators

- 🟢 **Healthy**: All tests passing, coverage >80%, no vulnerabilities
- 🟡 **Warning**: Some tests failing, coverage 60-80%, low vulnerabilities
- 🔴 **Critical**: Multiple test failures, coverage <60%, high vulnerabilities

## Maintenance

### Weekly Tasks (Automated by Dependabot)
- Review dependency updates
- Merge security patches
- Update GitHub Actions

### Monthly Tasks
- Review coverage trends
- Update test documentation
- Refactor flaky tests
- Optimize CI/CD pipeline

### Quarterly Tasks
- Review testing strategy
- Evaluate new testing tools
- Update Node.js versions
- Archive old test reports

## Troubleshooting

### Common Issues

#### Tests Failing Locally but Passing in CI
- Check Node.js version mismatch
- Verify environment variables
- Review platform-specific code (Windows vs Unix)

#### Coverage Not Uploading
- Check Codecov token configuration
- Verify lcov.info file generation
- Review network connectivity

#### Slow Test Execution
- Identify slow tests with `--test-reporter=spec`
- Mock heavy dependencies
- Parallelize test suites

## Resources

- [Node.js Test Runner](https://nodejs.org/api/test.html)
- [c8 Coverage Tool](https://github.com/bcoe/c8)
- [ESLint Documentation](https://eslint.org/)
- [GitHub Actions](https://docs.github.com/en/actions)
- [Codecov](https://codecov.io/)

## Support

For testing issues:
1. Check workflow logs in GitHub Actions
2. Review test output locally
3. Open an issue with test failure details
4. Tag maintainers for assistance
