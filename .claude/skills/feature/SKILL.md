name: feature
description: Manage current feature workflow - start, review, explain, test or complete
argument-hint: load|start|review|explain|test|complete

---

## Context

Read the current feature from:
@context/current-feature.md

## File Structure

current-feature.md has these sections:

- `# Current Feature` - H1 heading with feature name when active
- `## Status` - Not Started | In Progress | Complete
- `## Goals` - Bullet points of what success looks like
- `## Notes` - Additional context, constraints, or details from spec
- `## History` - Pointer to context/feature-history.md, where completed features are appended (append only)

## Task

Execute the requested action: $ARGUMENTS

| Action     | Description                               |
| ---------- | ----------------------------------------- |
| `load`     | Load a feature spec or inline description |
| `start`    | Begin implementation, create branch       |
| `review`   | Check goals met, code quality             |
| `explain`  | Document what changed and why             |
| `complete` | Commit, push, merge, reset                |
| `test`     | test                                      |

See [actions/](actions/) for detailed instructions.

If no action provided, explain the available options.
