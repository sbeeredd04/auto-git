````prompt
# System Analysis and Design Prompt

## Context

This repository comprises:
- Auto-Git CLI (root) — AI-assisted commit generation, watch/reset workflows
- GitCue VS Code Extension (`/gitcue`) — interactive dashboards, AI terminal, services
- Shared libraries (`/lib`, `/utils`) — git, AI, watcher, config, rate limiting

Features often span CLI and Extension with shared services. Good design requires clear contracts, boundaries, and a plan for reliability and scale.

## Objective

Analyze and design a feature or system change with well-defined architecture, contracts, data flow, reliability/scalability/security considerations, and implementation guidance that enables predictable delivery.

## Inputs

- Problem statement and goals
- Primary user journeys and acceptance criteria
- Non-functional requirements: performance, reliability, security, UX
- Constraints/assumptions: platform, APIs, rate limits, storage
- Impacted components: CLI, Extension, Shared libs, External services

## Deliverables

- High-level architecture overview (text and optional diagrams)
- Contracts (types/interfaces, request/response, error models)
- Data flow and sequence of operations
- Scalability and performance plan
- Reliability and failure handling plan
- Security and privacy considerations
- Migration/compatibility plan
- Implementation plan and milestones
- Optional ADR/RFC documenting decisions and alternatives

## Architecture

Describe key components and boundaries:
- CLI commands and flows (`bin/auto-git.js`, `lib/*.js`)
- Extension activation, commands, services (`gitcue/src/services/*.ts`)
- Shared utilities (`utils/`, `lib/`)
- External APIs (AI), local git, filesystem watchers

Include a concise diagram (mermaid pseudocode acceptable in docs):

```
flowchart TD
  User --> CLI[Auto-Git CLI]
  User --> Ext[GitCue Extension]
  CLI --> Git[Local Git]
  CLI --> AI[AI Provider]
  Ext --> Svc[Extension Services]
  Svc --> Git
  Svc --> AI
  Watch[File Watcher] --> CLI
  Watch --> Ext
```

## Contracts

For each boundary, specify:
- Inputs: schema/types, required/optional
- Outputs: schema/types, side effects
- Errors: codes/types, retryability, user-facing messages
- Timeouts and retries, idempotency
- Security: secrets handling, validation, redaction

Example (AI Commit Generation):
- Input: { diff: string; repoMeta: { branch: string; topLanguages: string[] } }
- Output: { shouldCommit: boolean; commitMessage?: string; reason: string }
- Errors: { kind: 'rate_limit' | 'unauthorized' | 'timeout' | 'invalid_response' }
- Retry: exponential backoff with jitter; max attempts 3

## Data Flow

- Describe end-to-end sequences for key journeys
- Identify sync vs async tasks; queueing/debouncing where needed
- Note state transitions and persistence needs (if any)

## Scalability & Performance

- Bottlenecks: API latency, watcher event storms, git operations on large repos
- Strategies: debouncing, batching, caching, streaming, lazy init
- Metrics: time-to-commit, CPU/memory usage, API call rate
- Limits: provider quotas; implement rate limiter guards

## Reliability & Failure Handling

- Fallbacks when AI or git are unavailable
- Safe defaults: do not commit when uncertain; user prompts
- Retries with caps and circuit breakers
- Resource cleanup: disposables, watchers, timers

## Security & Privacy

- Secret management (env vars, config files)
- Least privilege access; avoid shell injection
- Input validation and output sanitization
- Redact secrets from logs; avoid storing diffs with sensitive data

## Implementation Plan

- Milestones with acceptance criteria
- Feature flags/config for rollout
- Backwards compatibility; no breaking changes unless MAJOR
- Testing strategy: unit, integration, manual, performance
- Documentation plan: README updates, screenshots if UX changes

## ADR Template (Optional)

```
# ADR: <Title>

Date: YYYY-MM-DD
Status: Proposed | Accepted | Rejected | Superseded by ADR-XXX

Context
- <Background and constraints>

Decision
- <What is decided and why>

Alternatives Considered
- <Option A>
- <Option B>

Consequences
- <Positive/negative tradeoffs>

Rollout Plan
- <Flags, migration, monitoring>
```

## Output Format

Provide a concise design dossier:

```
Design Summary
=============
Feature: <name>
Scope: <CLI|Extension|Shared>

Architecture:
- [Key components and boundaries]

Contracts:
- [List key contracts]

Data Flow:
- [Primary sequences]

Non-Functional:
- Performance: [...]
- Reliability: [...]
- Security: [...]

Plan:
- Milestones and acceptance criteria
- Testing and rollout strategy

Risks & Mitigations:
- [Top risks and mitigations]
```

## Review Checklist

- [ ] Clear problem statement and goals
- [ ] Explicit contracts and error models
- [ ] Performance and reliability considered
- [ ] Security and privacy addressed
- [ ] Backwards compatibility/migration plan
- [ ] Test and rollout plan defined
- [ ] Docs and diagrams provided/updated

````