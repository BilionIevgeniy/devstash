# Deferred Work

Things decided for later. CLAUDE.md does not import this file: read it when the project is feature-complete or when asked what is left. Delete an item when it is done.

## Auth

- **Password length limit counts characters, but bcrypt reads bytes.** `MAX_PASSWORD_LENGTH` (72, in `auth/domain/password-reset.ts`) is applied by `.max(72)` in `auth/schemas.ts`, which counts characters. bcryptjs silently ignores everything after the first 72 bytes, so a multi-byte password such as `"é".repeat(72)` (72 characters, 144 bytes) is accepted, and a different password with the same first 72 bytes verifies against its hash. Found on 2026-10-28 while writing the schema tests; checked against the installed bcryptjs, no code changed. Fix idea: reject a password over 72 bytes (a byte-length check in the schemas, with the message saying bytes or characters accordingly) and cover it with tests. It needs its own change.

## Tests

- **Mutation check of the unit tests.** Once the whole project is implemented, check that the tests can fail. Break one rule at a time in the source (for example `<=` to `<` in `auth/domain/reauth.ts`, remove the `Math.max(1, …)` clamp in `auth/domain/rate-limits.ts`, remove `.toLowerCase()` from `emailSchema`), confirm the matching test goes red, then revert the change. All tests written so far passed on their first run, so none has been shown to fail yet.

## Product

- **Custom item types (Pro).** Advertised on the pricing page (`src/app/(marketing)/_components/PricingSection.tsx`, "Custom item types") and in `project-overview.md`, but not built. Deferred on 2026-11-10 in favour of the feature plan in `context/features/plan/`. When it is built: Pro users create, rename and delete their own types (`ItemType.userId` already exists); review the tenant scoping of `getItemTypeByName` and `getItemTypesById` in `features/item-types/queries.ts`, which read without `userId` today (`getItemTypesById` has no filter at all, not even `isSystem`); deleting a type with items needs a decision (block or move items). The line is removed from the pricing page by feature 2 of `context/features/plan/`; `docs/arc42-lite.md` also mentions custom types and should say "deferred".
