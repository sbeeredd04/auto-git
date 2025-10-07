````prompt
# Feature Implementation Prompt

## Context

This repository has two primary deliverables:
- Auto-Git CLI (root package) — AI-powered Git automation
- GitCue VS Code Extension (`/gitcue`) — interactive sidebar + AI terminal

Both share services and conventions: AI commit generation, file watching, dashboards/webviews, and conventional commits. Implementations must be reliable, testable, and documented, with clean code and comments.

## Objective

Implement a new feature end-to-end with a solid design, high-quality code, comprehensive tests, updated docs, and clear release notes—without breaking existing workflows.

## Inputs

Provide the following before coding:
- Feature name and short description
- User story(ies) and acceptance criteria
- Affected area(s): CLI, Extension, Shared libs, Services
- Success metrics or KPIs (if applicable)
- Constraints and assumptions (performance, security, API limits)

## Deliverables

- Working code, passing builds and tests
- Unit/integration tests with meaningful coverage
- Updated documentation (README sections, usage, examples)
- Changelog entries (root and/or `gitcue/` as needed)
- Configuration and schema updates (if any)
- Optional ADR documenting the decision and alternatives

## Process

### 1) Discovery & Design
- Clarify scope, acceptance criteria, and edge cases
- Identify impacted modules and contracts:
  - CLI: `bin/`, `lib/`, `utils/`, `package.json` scripts
  - Extension: `gitcue/src/` services, commands, webviews
  - Shared: `lib/` services (AI, git, watcher, rate limiter, config)
- Define data contracts (inputs/outputs, types, error modes)
- Draft a small ADR (Architecture Decision Record) if non-trivial
- Consider non-functional requirements:
  - Performance (API latency, watcher throughput)
  - Reliability and error recovery
  - Security (secrets, sandboxing, input validation)
  - UX (clear messages, progress, cancelation)

### 2) Implementation Plan
- Branch naming: `feat/<scope-kebab-case>`
- Plan milestones: slice into small, testable PRs
- Feature flags or config toggles when appropriate
- Backwards compatibility plan (no breaking changes unless MAJOR)

### 3) Coding Standards and Practices
- TypeScript/JavaScript:
  - Prefer explicit types; narrow unions and enums
  - Pure functions for business logic; isolate side effects
  - Handle errors explicitly; never swallow exceptions
  - Provide structured error types and user-friendly messages
  - Avoid global state; prefer dependency injection for services
  - Small modules and functions; high cohesion, low coupling
- Logging and Telemetry:
  - Use existing logger utils; standard levels and contexts
  - No secrets in logs; redact sensitive fields
- Comments and Docs-in-Code:
  - Top-of-file context where helpful
  - JSDoc for public functions/classes
  - Explain “why” for non-obvious decisions
- Style:
  - Follow repo ESLint/TS config and formatting
  - Keep functions under ~30-40 lines when practical
  - Avoid premature optimization; document bottlenecks found

### 4) Tests
- Unit tests for core logic (happy path + 1-2 edges)
- Integration tests for service boundaries (git, AI, watcher)
- Extension tests for commands/webviews where relevant
- Regression tests for fixed bugs and critical paths
- Use realistic fixtures and diffs when testing AI commit generation

### 5) Documentation
- Update `README.md` sections affected (CLI/Extension)
- Add usage examples and screenshots/gifs if UX changes
- Document new config flags/fields with defaults and examples
- Update `CHANGELOG.md` and `gitcue/CHANGELOG.md` with categorized entries

### 6) Review & Validation
- Self-review with checklist below
- Request peer review; address comments promptly
- Smoke test on macOS (primary), and validate basic flows on Linux/Windows if feasible

### 7) Release Preparation
- Follow semantic versioning rules
- If feature is user-visible and released now: bump MINOR version
- Ensure conventional commit message format is used

## Contracts

Briefly define a small contract for every new or changed boundary:
- Inputs: types, required/optional fields
- Outputs: types, success states, side effects
- Errors: error types, retryability, user messages
- Performance: expected latency and timeouts

## Edge Cases to Consider
- Empty or trivial diffs, binary files, very large changes
- Missing API key or service unavailability
- Rate limiting and backoff
- Non-git folders or detached HEAD
- Windows path separators and shells
- Long-running watch sessions (memory/handles)

## Output Format

Provide a short, structured summary upon completion:

```
Feature Implementation Summary
==============================
Feature: <name>
Scope: <CLI|Extension|Shared>
Branches/PRs: <links or names>

Changes:
- [High-level bullet list of changes]

Tests:
- [List key tests added/updated]

Docs:
- [Files and sections updated]

Risk & Mitigation:
- [Top risks and mitigations]

Validation:
- Build: PASS/FAIL
- Lint/Typecheck: PASS/FAIL
- Unit/Integration Tests: PASS/FAIL (# passed)
- Smoke test: PASS/FAIL

Versioning:
- [SemVer decision, bump? reason]
```

## Review Checklist

- [ ] Clear contracts for new boundaries
- [ ] Solid error handling and messages
- [ ] No secret leakage in logs
- [ ] Tests cover happy path and edge cases
- [ ] Performance implications considered
- [ ] Docs updated and examples runnable
- [ ] Changelog entries added
- [ ] Conventional commits used (no emojis)
- [ ] Backwards compatible or documented breaking change

## Conventional Commit Template

```
feat(<scope>): <short summary>

- <notable change 1>
- <notable change 2>

Refs: <issues/links>
```

## Notes

- Keep PRs small and focused
- Use feature flags if behavior is experimental
- Prefer internal abstractions over exposing new public APIs unless necessary
- Favor incremental delivery with visible user value

````