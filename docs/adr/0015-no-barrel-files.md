# 0015. No barrel files; a feature's public API is defined by lint

- Status: accepted
- Date: 2026-11-11

## Context

Many projects give each feature an `index.ts` that re-exports its parts, so another module writes `import { a, b, c } from "@/features/auth"` instead of one import per file. The architecture rules have forbidden this from the start ("No `index.ts` barrels"), but without a reason on record, so the question keeps coming back.

The public API of a feature is already defined without a barrel: everything outside its `_internal/` folder, enforced by lint ([ADR 0002](0002-boundaries-enforced-by-eslint.md)). A barrel would only change how the imports are written.

A feature mixes modules that must not meet in one bundle: `queries.ts` and `services/` start with `import "server-only"`, `actions/` with `"use server"`, browser helpers with `import "client-only"`, and `components/` holds both server and client components.

## Options

1. **A barrel per feature** (`features/<name>/index.ts`) that re-exports everything public.
2. **A barrel per role** (`features/<name>/components/index.ts` and so on).
3. **A barrel of types only** (`export type { … }`), erased at compile time.
4. **Import by full path**, as now: `@/features/billing/queries`, `@/features/items/components/ItemList`.

## Decision

Option 4. A barrel is never added, at any level.

Against option 1:

- **Server and client code meet in one module.** A client component that imports one button from `@/features/auth` makes the bundler walk the whole barrel, including modules that start with `import "server-only"`, and the build fails. Tree-shaking does not help: `package.json` declares no `sideEffects`, so the bundler must evaluate every re-exported module for its side effects, and `server-only` is a side-effect import by design
- **The lint loses the roles.** The boundary rules read the import path: `components/` never imports `services/`, Prisma only in `queries.ts`, services and `lib`, the read and write split ([ADR 0009](0009-read-write-split-enforced-by-lint.md)). `import { x } from "@/features/auth"` does not say which role `x` comes from, so a component could take a service through the barrel and every one of these rules would pass in silence
- **False cycles.** As soon as a file inside a feature imports from its own barrel, `import/no-cycle` reports a cycle, and across ranks the barrel pulls a whole lower feature into every importer's graph
- **Slower builds and heavier tests.** The Next.js guide (`node_modules/next/dist/docs/01-app/02-guides/local-development.md`, "Barrel files") advises importing from the specific file, because the compiler has to parse every re-exported module. `optimizePackageImports` works for packages in `node_modules`, not for our `src/`. Under Vitest a test that needs one function would load the whole feature, including `next-auth` and Prisma, which do not load there ("Testing" in `context/coding-standards.md`), and a mock would have to target the barrel instead of the module it replaces

Against option 2: `components/` holds server components that call queries next to client components, so a `components/index.ts` brings back the first problem. `queries.ts`, `schemas.ts` and `types.ts` are already one file per role, so their imports are flat without a barrel.

Against option 3: types already live in one `types.ts` per feature (and next to the value they come from, see "Where types live" in the architecture rules); a type barrel would add a file and save nothing.

## Consequences

- Imports name the file and so the role: a reviewer and the lint see at a glance whether a component reaches into a service
- Component imports are longer (`@/features/items/components/ItemList`), the price of one exported component per file. The IDE writes them, and a move is a path rename the IDE also follows
- The imports of the other roles stay short: `@/features/billing/queries`, `@/features/items/schemas`, `@/features/items/types`
- If a feature ever ships as its own package (the planned CLI or an extension), it gets its own entry point in `package.json` with `exports` and `sideEffects`; that is a package boundary, not a barrel inside `src/`, and it gets its own record
