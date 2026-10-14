---
name: list-components
description: List project components
argument-hint: subdirectory
---

## Task

List all React component files (.tsx, .ts, .jsx, .js) in the components folder.

If a [subdirectory] is provided via $ARGUMENTS, only list files in that subdirectory.

## Output Format

- Numbered list of files wit h relative paths
- Brief one-line description of each (infer from filename)
- Group them
- Make shure i can open file
- Summary count at the end

If no files found, say "No components found."
