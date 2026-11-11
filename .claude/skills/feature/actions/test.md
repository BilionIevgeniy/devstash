# Test Action

1. Read current-feature.md to understand what was implemented
2. Identify server actions and utility functions added/modified for this feature
3. Check if tests already exist for these functions
4. For functions without tests that have testable logic, write unit tests:
   - Create unit tests using Vitest
   - Focus on server actions and utilities. A component or hook with real client logic (an optimistic update, a race, the state of a form) gets a `[name].test.tsx` in the `dom` project; a thin component does not (see "Testing" in `context/coding-standards.md`)
   - Test happy path and error cases
   - A new or changed query or service that takes a `userId` gets a cross-user case in its `[name].int.test.ts` (see "Integration tests" in `context/coding-standards.md`)
   - Do not write tests just to write them. Use your best judgement
5. Run `npm test` to verify all tests pass, `npm run test:integration` when a query or service changed, and `npm run test:e2e` when a page, a route or the sign-in or item flows changed (a new journey follows "End-to-end tests" in `context/coding-standards.md`)
6. Report test coverage for the new feature code
