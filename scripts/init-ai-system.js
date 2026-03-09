const fs = require("fs");
const path = require("path");

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
}

function writeFileIfMissing(filePath, content) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content, "utf8");
    console.log(`Created file: ${filePath}`);
  } else {
    console.log(`Skipped existing file: ${filePath}`);
  }
}

function slugToTitle(slug) {
  return slug
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const files = {
  "docs/00-project/vision.md": `# Product Vision

Describe the product vision, target users, and long-term direction.

## Problem
## Users
## Value Proposition
## Strategic Direction
`,
  "docs/00-project/roadmap.md": `# Product Roadmap

## Current Phase
## Next Milestones
## Backlog Themes
## Risks
`,
  "docs/00-project/stack.md": `# Tech Stack

## Backend
## Frontend
## Database
## Infra
## Integrations
`,
  "docs/00-project/non-negotiables.md": `# Non-Negotiables

- Multi-tenant safety
- WhatsApp session isolation
- Documentation as source of truth
- Small reversible changes
`,
  "docs/01-architecture/system-overview.md": `# System Overview

## Purpose
## Main Components
## Data Flow
## Runtime Concerns
`,
  "docs/01-architecture/backend-architecture.md": `# Backend Architecture

## Entry Points
## Modules
## API Pattern
## Persistence
## Async Flows
`,
  "docs/01-architecture/frontend-architecture.md": `# Frontend Architecture

## App Structure
## Routing
## State Management
## Realtime / SSE
## UI Conventions
`,
  "docs/01-architecture/whatsapp-session-architecture.md": `# WhatsApp Session Architecture

## Session Model
## Auth Storage
## Isolation Strategy
## Failure Modes
## Operational Concerns
`,
  "docs/01-architecture/event-flow-sse.md": `# Event Flow and SSE

## Event Sources
## Backend Emission
## Frontend Consumption
## Failure / Reconnect Strategy
`,
  "docs/02-decisions/ADR-template.md": `# ADR-XXX: Title

## Status
Proposed

## Context

## Decision

## Consequences

## Alternatives Considered
`,
  "docs/03-workflows/backend-workflow.md": `# Backend Workflow

1. Understand request
2. Identify affected files
3. Plan implementation
4. Implement minimal scoped change
5. Validate route/service behavior
6. Update docs if needed
7. Return structured summary
`,
  "docs/03-workflows/frontend-workflow.md": `# Frontend Workflow

1. Understand request
2. Identify affected components/pages
3. Plan implementation
4. Implement minimal scoped change
5. Validate states and integration
6. Update docs if needed
7. Return structured summary
`,
  "docs/03-workflows/review-workflow.md": `# Review Workflow

## Review Checklist
- Scope alignment
- Contract consistency
- Error handling
- Edge cases
- Documentation updates
- Regressions risk
`,
  "docs/04-prompts/backend-task.md": `# Backend Task Prompt Template

Objective:
[exact expected result]

Scope:
[what should be included]

Out of scope:
[what must not be changed]

Constraints:
[patterns to follow, compatibility, etc.]

Validation:
[test/lint/manual checks]
`,
  "docs/04-prompts/frontend-task.md": `# Frontend Task Prompt Template

Objective:
[exact expected result]

Scope:
[what should be included]

Out of scope:
[what must not be changed]

Constraints:
[UI consistency, API assumptions, etc.]

Validation:
[test/lint/manual checks]
`,
  "docs/04-prompts/review-task.md": `# Review Task Prompt Template

Review this diff or implementation for:
- scope alignment
- correctness
- edge cases
- regressions
- documentation gaps
- safer alternatives
`,
  "docs/04-prompts/doc-task.md": `# Documentation Task Prompt Template

Update or create the project documentation for:
- architecture changes
- decisions taken
- contracts introduced
- workflows affected
`,
  "docs/05-features/feature-template.md": `# Feature: Name

## Objective
## Scope
## Out of Scope
## User Flow
## Technical Notes
## API / Data Contracts
## Risks
## Acceptance Criteria
`,
  "docs/06-operations/deploy.md": `# Deploy Operations

## Environments
## Deploy Steps
## Rollback
## Post-deploy Checks
`,
  "docs/06-operations/monitoring.md": `# Monitoring

## Key Signals
## Logs
## Alerts
## Failure Patterns
`,
  "docs/06-operations/backups.md": `# Backups

## What to back up
## Backup frequency
## Restore process
`,
  "skills/backend-feature.md": `# Skill: backend-feature

Use this when implementing a backend feature.

## Steps
1. Understand scope
2. Find existing patterns
3. Identify routes/controllers/services/repos affected
4. Implement minimal scoped change
5. Validate inputs and outputs
6. Update API/docs if behavior changed
7. Return structured summary
`,
  "skills/frontend-feature.md": `# Skill: frontend-feature

Use this when implementing a frontend feature.

## Steps
1. Understand scope
2. Find existing page/component/state patterns
3. Implement minimal scoped change
4. Handle loading, empty, error states
5. Validate integration assumptions
6. Update docs if user flow changed
7. Return structured summary
`,
  "skills/bugfix-debug.md": `# Skill: bugfix-debug

Use this when fixing a bug.

## Steps
1. Reproduce or infer failing behavior
2. Locate likely root cause
3. Implement minimal correction
4. Validate side effects
5. Document root cause if relevant
6. Return structured summary
`,
  "skills/review-diff.md": `# Skill: review-diff

Use this when reviewing a diff or implementation.

## Review for
- scope alignment
- correctness
- regressions
- missing validation
- missing docs
- safer alternatives
`,
  "skills/update-docs.md": `# Skill: update-docs

Use this when changes require documentation.

## Actions
- find correct doc location
- update or create target file
- keep documentation concise and durable
- reflect actual implemented behavior
`,
  "skills/task-spec.md": `# Skill: task-spec

Turn a rough request into a clean task spec.

## Output
- objective
- scope
- out of scope
- constraints
- affected files
- validation
- docs to update
`,
};

const dirs = [
  "docs/00-project",
  "docs/01-architecture",
  "docs/02-decisions",
  "docs/03-workflows",
  "docs/04-prompts",
  "docs/05-features",
  "docs/06-operations",
  "docs/07-task-log",
  "skills",
  "scripts",
];

for (const dir of dirs) {
  ensureDir(dir);
}

for (const [filePath, content] of Object.entries(files)) {
  writeFileIfMissing(filePath, content);
}

console.log("\nHoly AI agent system initialized.");
console.log("Next recommended steps:");
console.log("1. Review AGENTS.md");
console.log("2. Customize docs/00-project and docs/01-architecture");
console.log("3. Start using new-task.js / new-feature.js / new-adr.js");