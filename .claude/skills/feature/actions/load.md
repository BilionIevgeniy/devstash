# Load Action

1. Check $ARGUMENTS (after "load"):
   - If it looks like a filename (single word, no spaces): Look for `context/features/plan/{name}.md`
   - If it's multiple words: Use as inline feature description, generate goals
   - If empty: Error - "load" requires a spec filename or feature description

2. Update current-feature.md:
   - Update H1 heading to include feature name (e.g., `# Current Feature: Add Navbar`)
   - Write goals as bullet points under ## Goals
   - Write any additional notes/context under ## Notes
   - Rate the spec with "Choosing the model" in `context/ai-interaction.md`, by what it builds and not by its length, and write three lines under ## Model: `Plan:`, `Implementation:` and `architecture-reviewer:`, each with the model alias and the row of the table that decided it
   - Set Status to "Not Started"

3. Confirm spec loaded and show the feature summary, then the model: `for /feature start I recommend /model <alias>`

4. Move file from "context/features/plan/" to "context/features"
