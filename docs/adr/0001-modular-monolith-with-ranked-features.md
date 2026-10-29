# 0001. Modular monolith with ranked features

- Status: accepted
- Date: 2026-10-29

## Context

DevStash is one Next.js app with one database. One developer works on it today, a team is expected later, and an AI assistant writes much of the code. Both need to know without asking where a piece of code goes and what it may depend on. The Next.js docs do not decide this for us: they say to choose a strategy that works for the team and to be consistent ([project structure](https://nextjs.org/docs/app/getting-started/project-structure)).

## Options

1. **Layers by technical type** (`components/`, `hooks/`, `services/` for the whole app). Easy to start, but a feature is spread over many folders and nothing limits who imports what.
2. **Feature folders without dependency rules.** Features are easy to find, but cycles and tangles appear as the product grows.
3. **Feature folders with ranks.** A feature imports only features of a lower rank.
4. **Separate packages or services.** Strong boundaries, but the cost of building and deploying them is not justified for one app.

## Decision

Option 3. The product is a modular monolith: one folder per feature in `src/features/`, a rank per feature, and one role per file inside a feature (`domain`, `schemas`, `queries`, `services`, `actions`, `components`). `src/app/` only routes and composes pages. The module catalogue is [docs/modules.md](../modules.md).

## Consequences

- Dependencies point one way and cannot form a loop, so a feature can be understood, tested and, if ever needed, extracted on its own
- A new file has one obvious place, which is what an AI assistant needs
- A linear rank is brittle: past about twelve features an explicit list of allowed dependencies per feature may fit better
- Two features at the same rank cannot share code; the shared code moves down to a lower rank, or the pieces are composed in `app/`

## More information

Spring Modulith uses the same idea for the JVM: a module's internals are hidden and its allowed dependencies can be verified ([verification](https://docs.spring.io/spring-modulith/reference/verification.html)). That this is common in large German teams is the opinion of the review that proposed it, not something we checked.
