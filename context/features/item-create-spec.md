# Item Create

> Adapted to our architecture (paths: `context/architecture-rules.md`, "Old paths in specs"). The course wording is kept in `/Users/ievgenbilion/Programming/Projects/Devstash/featuresDRAFT.original/`. Changed requirements are marked `[changed: ...]`.

## Overview

Add new items via a modal dialog. Opens from "New Item" button in top bar.

## Requirements

- Use shadcn Dialog component
- Type selector (snippet, prompt, command, note, link)
- Fields shown based on selected type:
  - All types: title (required), description, tags
  - snippet/command: content, language
  - prompt/note: content
  - link: URL (required)
- Server action `createItem` in `items/actions/item.ts`: parses with the Zod schema in `items/schemas.ts`, then makes one call into the service
- Write function `createUserItem(userId, input)` in `items/services/item.ts` `[changed: ADR 0003, course: query function createItem in lib/db/items.ts]`
- Toast on success, close modal and refresh
