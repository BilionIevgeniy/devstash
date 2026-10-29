# 0003. Every write goes through a service

- Status: accepted
- Date: 2026-10-29

## Context

A write needs more than a database call: the owner in the `where`, a limit or permission check, sometimes a vendor, a rate limit or an email. The Next.js guide on data security recommends a server-only data access layer and thin `"use server"` actions ([data security](https://nextjs.org/docs/app/guides/data-security)). The question is where the operation itself lives.

## Options

1. **Write in the Server Action.** Fewest files, but the action then reads the request and does the work, and it cannot be tested without Next.js.
2. **Write in `queries.ts`.** Mixes reads and writes in one file, and the lint cannot tell a harmless read from a write.
3. **A `services/<topic>.ts` for every write and every operation that goes beyond the feature's own tables.**

## Decision

Option 3, with no exceptions. An entry point (a Server Action, a `route.ts` or a page) reads the request, parses the input with a schema and makes one call into a service. A service never reads the request: `userId`, `ip` and `origin` come in as parameters. Services return `OperationResult`, actions return `ActionResult<T>`.

## Consequences

- A read is two hops (page, query); a write is three (component, action, service). That is the price of one rule
- Some services will be a few lines long
- Services can be tested without Next.js, with only their boundaries mocked
- A webhook, a Server Action and a future public API call the same service
- Services do not import `next/headers`, `next/cache` or `next/navigation`; the lint checks it
