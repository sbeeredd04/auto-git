````prompt
# Feature Fix and Bug Resolution Prompt

## Context

This repository powers:
- Auto-Git CLI (AI commit generation, watch, reset)
- GitCue VS Code Extension (commands, dashboards, AI terminal)

Bugs often involve service boundaries: AI API calls, git operations, file watching, rate limiting, and extension webviews.

## Objective

Triage, reproduce, diagnose, and fix a bug or regressions with clear validation, regression tests, and documentation—minimizing risk and avoiding new issues.

## Inputs

- Bug title and description
- Environment details (OS, Node, versions of CLI/Extension)
- Steps to reproduce and expected vs actual behavior
- Logs or screenshots if available

## Process

### 1) Triage
- Severity and impact assessment
- Confirm affected versions and platforms
- Check recent changes (git log, changelog, PRs)
- Identify likely subsystems (AI, git, watcher, extension service)

### 2) Reproduction
- Create a clean test repo/environment
- Follow exact STR; capture outputs and logs
- Add minimal reproducible example when possible
- Note nondeterministic behaviors (timing, race conditions)

### 3) Root Cause Analysis
- Inspect code paths; trace inputs/outputs
- Add temporary debug logging (redact secrets)
- Consider environmental factors (permissions, network, shell)
- Check for boundary conditions and contract violations

### 4) Fix Implementation
- Small, targeted change with unit tests first (when possible)
- Preserve backwards compatibility unless explicitly breaking
- Use explicit types and validate inputs
- Handle errors with actionable messages and recovery paths
- Remove temporary debug logs before commit

### 5) Regression Tests
- Add tests reproducing the failure and asserting the fix
- Cover at least: happy path + the edge that broke
- For extension/webview, include integration or manual checks

### 6) Validation
- Run build, lint/typecheck, and tests
- Smoke test on primary platform (macOS)
- If cross-platform, validate path/separator and shell nuances
- Verify performance impact (watcher throughput, API latency)

### 7) Communication & Docs
- Update CHANGELOG with a clear Fixed section
- Add README notes if user-facing behavior changed
- Reference related issues/PRs in commit message

## Common Areas and Checks

- AI Integration (`lib/gemini.js`, `gitcue/src/utils/ai.ts`):
  - Missing/invalid API keys, rate limit, retries, timeouts
  - Malformed responses, schema validation
- Git Operations (`lib/git.js`, services):
  - Detached HEAD, untracked files, staging and resets
  - Push failures, auth, conflicts
- File Watching (`lib/watcher.js`, `gitcue/src/services/fileWatcherService.ts`):
  - Debounce, event storms, ignored paths, CPU spikes
- Extension UI/Services (`gitcue/src/services/*.ts`):
  - Webview message contracts, state sync, disposal leaks

## Output Format

Provide a short, structured summary after the fix:

```
Bug Fix Summary
==============
Issue: <link or id>
Scope: <CLI|Extension|Shared>

Root Cause:
- [Concise description]

Changes:
- [Code changes at a high level]

Tests:
- [New/updated tests and coverage]

Validation:
- Build: PASS/FAIL
- Lint/Typecheck: PASS/FAIL
- Tests: PASS/FAIL (# passed)
- Manual smoke test notes

Risk:
- [Residual risks and mitigations]
```

## Review Checklist

- [ ] Reproduced the issue
- [ ] Minimal, targeted fix
- [ ] Clear error handling and messages
- [ ] No secrets in logs or errors
- [ ] Added regression tests
- [ ] Docs and changelog updated
- [ ] Conventional commit used (no emojis)
- [ ] Cross-platform considerations addressed

## Conventional Commit Template

```
fix(<scope>): <short summary>

- <notable change 1>
- <notable change 2>

Refs: <issues/links>
```

## Notes

- Prefer test-first when feasible
- Keep fixes small; avoid opportunistic refactors
- If the fix is risky, guard with a feature flag/config and default safe

````