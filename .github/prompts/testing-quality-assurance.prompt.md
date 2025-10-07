# Testing and Quality Assurance Prompt

## Context

This repository requires comprehensive testing to ensure reliability and correctness of:
- Auto-Git CLI functionality
- GitCue VS Code extension features
- AI integration and API calls
- File watching and commit automation
- Configuration management
- Error handling and recovery

While automated tests are minimal, thorough manual testing and quality assurance processes are essential.

## Objective

Implement comprehensive testing strategies, perform thorough quality assurance, identify and fix bugs, and ensure the system works reliably across different environments and use cases.

## Testing Structure

### Test Organization

**Auto-Git CLI Testing:**
- Manual command testing
- Integration testing with Git
- AI API testing
- Configuration validation
- Cross-platform compatibility

**GitCue Extension Testing:**
- VS Code extension testing
- UI/UX testing
- Command testing
- Service integration testing
- Webview functionality

**Integration Testing:**
- CLI and extension compatibility
- End-to-end workflows
- Real-world usage scenarios

## Requirements

### Manual Testing Checklist

**Auto-Git CLI Commands:**

```bash
# Configuration Testing
auto-git config              # Display configuration
auto-git setup               # Interactive setup
auto-git debug               # System diagnostics

# Commit Operations
auto-git commit              # Single AI commit
auto-git commit --verbose    # Verbose commit

# File Watching
auto-git watch                           # Periodic mode
auto-git watch --mode intelligent        # Intelligent mode
auto-git watch --no-push                 # Without pushing
auto-git watch --paths "src/**"          # Specific paths

# Reset Operations
auto-git reset 1             # Reset last commit
auto-git reset 3 --soft      # Soft reset
auto-git reset 1 --hard      # Hard reset (careful!)

# Interactive Mode
auto-git interactive         # Open REPL
```

**GitCue Extension Commands:**

```
Ctrl+Alt+C / Cmd+Alt+C      # AI Commit
Ctrl+Alt+W / Cmd+Alt+W      # Toggle Auto-Watch
Ctrl+Alt+T / Cmd+Alt+T      # Open AI Terminal
Ctrl+Alt+X / Cmd+Alt+X      # Cancel Commit
Ctrl+Shift+P > GitCue       # Access all commands
```

### Test Scenarios

**Basic Functionality:**

1. **Installation and Setup**
   ```bash
   # Test CLI installation
   npm install -g @sbeeredd04/auto-git
   auto-git --version
   auto-git config
   
   # Test extension installation
   code --install-extension gitcue-0.4.0.vsix
   ```

2. **Configuration**
   ```bash
   # Test environment variables
   export GEMINI_API_KEY="test-key"
   auto-git config
   
   # Test config file
   echo '{"apiKey":"test-key"}' > ~/.auto-gitrc.json
   auto-git config
   ```

3. **Single Commit**
   ```bash
   # Make changes
   echo "test" > test.txt
   
   # Test commit
   auto-git commit --verbose
   
   # Verify commit
   git log -1
   ```

4. **File Watching**
   ```bash
   # Start watcher
   auto-git watch --mode intelligent --verbose
   
   # Make changes
   echo "change" >> test.txt
   
   # Observe behavior
   # - Activity detection
   # - AI analysis
   # - Commit decision
   # - Buffer period
   # - Commit execution
   ```

**Advanced Scenarios:**

1. **Intelligent Mode Testing**
   ```bash
   # Test commit thresholds
   # Make trivial change (formatting)
   # Make minor change (bug fix)
   # Make major change (new feature)
   # Verify AI decisions match expectations
   ```

2. **Rate Limiting**
   ```bash
   # Make rapid changes
   # Verify rate limiting kicks in
   # Check error messages
   # Verify recovery
   ```

3. **Error Handling**
   ```bash
   # Test without API key
   unset GEMINI_API_KEY
   auto-git commit
   
   # Test outside git repo
   cd /tmp
   auto-git commit
   
   # Test with network issues
   # Disconnect network
   auto-git commit
   ```

4. **Cross-Platform Testing**
   ```bash
   # Test on:
   # - macOS (primary)
   # - Linux (Ubuntu, Fedora)
   # - Windows (PowerShell, WSL)
   
   # Verify:
   # - Path handling
   # - Shell compatibility
   # - Terminal controls
   # - File watching
   ```

### AI Integration Testing

**API Call Testing:**

```javascript
// Test scenarios
1. Valid API key, successful call
2. Invalid API key, error handling
3. Rate limit exceeded, wait time
4. Network timeout, retry logic
5. Malformed response, validation
6. Empty diff, skip handling
```

**Response Validation:**

```javascript
// Verify responses contain:
- Valid commit message format
- Proper conventional commit structure
- No emojis
- Appropriate length (subject < 50 chars)
- Meaningful description
- Correct type and scope
```

**Function Calling:**

```javascript
// Test function calling responses
{
  shouldCommit: boolean,     // Present
  reason: string,            // Not empty
  significance: enum,        // Valid value
  completeness: enum,        // Valid value
  changeType: enum,          // Valid value
  commitMessage: string      // Valid if shouldCommit true
}
```

### GitCue Extension Testing

**UI Testing:**

1. **Sidebar Views**
   - Dashboard loads correctly
   - Activity feed updates
   - Settings display properly
   - Buttons are clickable
   - Icons display correctly

2. **Webview Dashboards**
   - Dashboard renders
   - Status updates in real-time
   - Buttons trigger actions
   - Configuration loads
   - Activity history displays

3. **Notifications**
   - Success notifications
   - Error notifications
   - Warning notifications
   - Buffer countdown
   - Progress indicators

**Command Testing:**

```typescript
// Test all commands
- gitcue.commit
- gitcue.watchToggle
- gitcue.openDashboard
- gitcue.reset
- gitcue.configure
- gitcue.cancelCommit
- gitcue.openInteractiveTerminal
- gitcue.refreshViews
```

**Service Testing:**

```typescript
// Test service interactions
- CommitService.commitWithPreview()
- CommitService.commitWithBuffer()
- FileWatcherService.startWatching()
- FileWatcherService.stopWatching()
- ActivityLogger state updates
- DashboardService webview management
```

## Guidelines

### Test Execution

**Pre-Test Setup:**

```bash
# Create test repository
mkdir test-repo && cd test-repo
git init
git config user.name "Test User"
git config user.email "test@example.com"

# Set up API key
export GEMINI_API_KEY="your-test-key"

# Install Auto-Git
npm install -g @sbeeredd04/auto-git
```

**Test Execution Process:**

1. **Prepare Environment**: Clean state, proper configuration
2. **Execute Test**: Run specific test scenario
3. **Observe Behavior**: Check logs, output, state changes
4. **Verify Results**: Confirm expected outcomes
5. **Clean Up**: Reset state for next test
6. **Document**: Record results, issues, observations

**Test Documentation:**

```markdown
Test Case: Intelligent Mode Commit Decision

Setup:
- Fresh git repository
- API key configured
- Intelligent mode enabled

Steps:
1. Make trivial change (add comment)
2. Save file
3. Wait for analysis

Expected:
- AI analyzes change
- Decision: Do not commit
- Reason: Trivial change below threshold

Actual:
[Record actual behavior]

Status: [PASS/FAIL]
Notes: [Any observations]
```

### Bug Reporting

**Bug Report Template:**

```markdown
## Bug Description
[Clear description of the issue]

## Environment
- OS: macOS 14.0
- Node: v18.0.0
- Auto-Git: v4.0.0
- GitCue: v0.4.0

## Steps to Reproduce
1. [First step]
2. [Second step]
3. [Third step]

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happens]

## Logs
```
[Relevant log output]
```

## Screenshots
[If applicable]

## Additional Context
[Any other relevant information]
```

### Performance Testing

**Metrics to Track:**

- API call latency
- File watching event frequency
- Memory usage over time
- CPU usage during operations
- Commit execution time
- UI responsiveness

**Performance Test Scenarios:**

```bash
# Large repository test
git clone large-repo
cd large-repo
auto-git watch --mode intelligent

# Many files changed
touch file{1..100}.txt
# Observe: Event batching, debouncing, performance

# Rapid file changes
for i in {1..50}; do
  echo "change $i" >> test.txt
  sleep 0.1
done
# Observe: Debouncing, API optimization

# Long-running test
auto-git watch &
# Let run for hours
# Observe: Memory leaks, stability, error recovery
```

### Regression Testing

**After Code Changes:**

1. Run full test suite
2. Test affected features specifically
3. Test integration points
4. Verify no new bugs introduced
5. Check performance impact
6. Update tests if needed

**Critical Paths to Test:**

- API key validation
- Commit message generation
- Commit execution and push
- File watching and debouncing
- Configuration loading
- Error handling and recovery

## Output Format

### Test Report

```
Test Execution Report
====================

Date: 2025-01-XX
Tester: [Name]
Version: Auto-Git v4.0.0, GitCue v0.4.0
Environment: macOS 14.0, Node v18.0.0

Test Summary:
- Total Tests: 45
- Passed: 42
- Failed: 3
- Skipped: 0

Failed Tests:
1. Test Name: Rate limiting with rapid changes
   Status: FAIL
   Issue: Rate limiter allows one extra call
   Severity: Low
   
2. Test Name: Windows PowerShell compatibility
   Status: FAIL
   Issue: Path separator issues
   Severity: Medium
   
3. Test Name: Extension webview refresh
   Status: FAIL
   Issue: Dashboard doesn't update after config change
   Severity: Low

Performance:
- Average API latency: 234ms
- Memory usage: Stable at 45MB
- CPU usage: <5% idle, <20% active

Recommendations:
1. Fix rate limiter boundary condition
2. Add Windows path normalization
3. Implement dashboard auto-refresh
4. Add automated tests for critical paths

Next Steps:
- Create issues for failed tests
- Prioritize by severity
- Retest after fixes
```

## Best Practices

### Testing Principles

1. **Test Early**: Test as you develop
2. **Test Often**: Regular testing prevents regressions
3. **Test Thoroughly**: Cover edge cases and error paths
4. **Test Realistically**: Use real-world scenarios
5. **Document Tests**: Clear test cases and results
6. **Automate When Possible**: Write automated tests
7. **Regression Test**: Retest after changes

### Quality Assurance

1. **Code Review**: Review all changes before merging
2. **Manual Testing**: Test user-facing features manually
3. **Integration Testing**: Test component interactions
4. **Performance Testing**: Monitor resource usage
5. **Security Testing**: Check for vulnerabilities
6. **Usability Testing**: Ensure good UX
7. **Documentation Review**: Keep docs current

## Validation

### Quality Checklist

- [ ] All commands work correctly
- [ ] Configuration loads properly
- [ ] API integration functions
- [ ] File watching is reliable
- [ ] Commits execute successfully
- [ ] Errors are handled gracefully
- [ ] Performance is acceptable
- [ ] UI/UX is intuitive
- [ ] Documentation is accurate
- [ ] No critical bugs
- [ ] Cross-platform compatibility
- [ ] Security is adequate

## Notes

- Testing is ongoing, not one-time
- Focus on user-facing functionality
- Prioritize critical paths
- Balance thoroughness with practicality
- Use real API keys for integration tests (carefully)
- Test in fresh environments when possible
- Keep test documentation updated
- Learn from production issues
