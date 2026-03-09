# Recovery Layer

The system must detect and recover from failures during development.

## Failure Types

Common failures:

- build errors
- failing tests
- runtime exceptions
- architecture violations
- dependency conflicts

## Recovery Workflow

If an implementation fails:

1. Debugger agent analyzes the failure.
2. Tester reproduces the issue.
3. Architect evaluates if the design caused the failure.
4. Coder applies a fix.
5. Reviewer validates the fix.

## Recovery Rules

- Never ignore failing tests.
- Never bypass errors with hacks.
- Always identify root cause before applying fixes.
- Prefer minimal fixes rather than large rewrites.

## Debug Strategy

When debugging:

1. Identify the failing module.
2. Analyze logs and stack trace.
3. Trace dependency chain.
4. Reproduce the error.
5. Implement a fix.

## Rollback Strategy

If a fix introduces instability:

- revert to last stable implementation
- isolate problematic change
- reimplement incrementally

## Logging

All failures should generate:

- description of the issue
- files involved
- suspected root cause
- resolution summary