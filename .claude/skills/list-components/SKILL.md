---
name: list-components
description: List project components
argument-hint: subdirectory
---

## Task

List all React component files (.tsx, .ts, .jsx, .js) in these folders:

- `src/components/ui` (shared shadcn/ui primitives)
- `src/features/**/*` (feature components)
- `src/app/**/*` (page-specific components)

If a [subdirectory] is provided via $ARGUMENTS, only list files in that subdirectory (for example `auth` for `src/features/auth`).

## Output Format

- Numbered list of files with relative paths
- Brief one-line description of each (infer from filename)
- Group them by feature
- Make sure i can open file
- Summary count at the end

If no files found, say "No components found."
