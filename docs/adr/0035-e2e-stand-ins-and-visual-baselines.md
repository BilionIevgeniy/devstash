# 0035. End-to-end stand-ins, fresh users and visual baselines

- Status: accepted
- Date: 2026-11-19

## Context

Feature 21 completes the end-to-end suite before feature 22 changes the headers and how every route renders. Four questions had to be settled:

- **Upstash.** Sign-in is rate-limited and fails closed, so the production build under test needs an Upstash REST API. Until now the e2e job used the app's own database (`devstash-ratelimit`; the free plan allows one), and its token sat in the GitHub secrets under Actions and Dependabot of a public repository. A fork PR got no secret and could not run the job.
- **R2.** An upload is a browser PUT to a signed URL, then a HEAD of the object by the server before the item is saved (`confirmUpload`). Neither can be intercepted from the browser alone, and the job has no R2 credentials.
- **Data.** Some journeys change their user for good: the 51st item of the Free plan, a password change. A retry or `--repeat-each` would meet a user already used up.
- **Screenshots.** Fonts render differently on every system, and the baselines must not flake.

## Decision

### Stand-ins for the vendors, none of them reachable for real

- **Upstash: a local Redis with the Upstash REST API in front.** Redis 8 and serverless-redis-http (SRH, `hiett/serverless-redis-http:0.0.10`) run in Docker (README) and as service containers of the e2e job. Plain Redis refuses the scripts of `@upstash/ratelimit` 2.2.1: their first line is `#!lua flags=allow-key-locking`, a flag only Upstash knows. `scripts/fake-upstash.ts`, started by Playwright like the OpenAI fake, sits in front of SRH and rewrites exactly that first line to `#!lua`; any other shebang flag is refused with an error that names it (unit-tested in `scripts/fake-upstash.test.ts`). The rewritten script hashes differently, so every EVALSHA gets NOSCRIPT and ratelimit falls back to EVAL: two round trips, still atomic, since Redis runs a script on one thread and the flag only matters for Upstash's own concurrency. `e2e/global-setup.ts` runs one script with that shebang through the whole chain before the first test and says what to start when it fails. The URL and token are constants (`scripts/fake-upstash.ts`), so the suite cannot reach a real Upstash; the `E2E_UPSTASH_*` variables and secrets are gone.
- **R2: `scripts/fake-r2.ts`**, an in-memory S3 subset on localhost: PUT, HEAD, GET and DELETE of one object, path-style, with CORS for the browser's PUT. Everything else answers 501, so a journey that starts another R2 call fails loudly. It checks no signature: the size and type the app signs are read back by `confirmUpload`.
- **`R2_ENDPOINT` is the one test hook in `src`.** The OpenAI SDK reads `OPENAI_BASE_URL` itself, so the app carries no hook for it. The S3 client would read `AWS_ENDPOINT_URL_S3` too, but the explicit `endpoint` of `getR2` wins over it. `lib/vendors/r2.ts` therefore takes `R2_ENDPOINT`, and only with a `localhost` or `127.0.0.1` host, in every environment: a stray value on a deployment throws instead of sending real users' files elsewhere.

What the suite does not cover: Upstash's own script execution and limits, and R2's signature checks. Production meets them; a ratelimit release that needs another Upstash feature fails in the setup, not silently.

### Fresh users per test

`scripts/e2e-fixture.ts <free|near-limit|pro>` creates a verified user for one test (a Free user, one with 49 items, or one with an active subscription row) and prints its email; `e2e/support/fresh-user.ts` runs it under tsx in a child process, where the generated Prisma client loads, and signs the user in through the form. Each call costs about a second. The journeys that change their user for good or need exact data use it: the Free limit, sign-out, the password change, favorites and pins, uploads, import and export. The spec asked for a seeded password user with a saved session; a fresh user replaces it, because a retry would meet a password it does not know and the password check is rate-limited per user (5 in 15 minutes).

### Visual baselines

- `e2e/visual.spec.ts` takes six screens (dashboard, type list, drawer, palette, settings, homepage) as a seeded user with fixed rows and dates in a past year (`scripts/e2e-visual-user.ts`). Masked is only what changes with the run or the clock: the run's email, and the drawer's "Updated", which is relative ("2 years ago"). The other dates are not masked: their format is absolute and the zone is fixed.
- The baselines are Linux only and come from the e2e job, on a pinned `ubuntu-24.04` runner. On any other system the spec is skipped. In CI `updateSnapshots` is `none`, so a missing baseline fails instead of being written for the retry to pass against; the job's artifact keeps `test-results/` with the `-actual.png` files, which are reviewed and committed.
- The budget is `maxDiffPixels: 100`, not a ratio: a changed border or button color fails, anti-aliasing noise does not.
- The trade-off: the Chromium build comes with `@playwright/test`, so a Playwright update can shift text rendering and turn the visual tests red on the Dependabot group. Its baselines are then updated on the bot's branch from the artifact, after the diffs have been looked at (`context/ai-interaction.md`). Running the job in the `mcr.microsoft.com/playwright` container would tie the fonts to the Playwright version, but its service containers are then reached by name, not `localhost`, which `requireTestDatabase` and the loopback rule of `R2_ENDPOINT` refuse.

### Where it runs, and what is left out

- The production build in CI, as since feature 5. Not the Vercel preview: its database is the `development` branch, shared by every preview, and the suite empties its database.
- Chromium only. Firefox and WebKit would double the job, and no journey depends on an engine difference; they can be added as projects later.
- Accessibility: `@axe-core/playwright` on the main pages, the open drawer, the palette, the create dialog and the consent banner; a serious or critical violation of WCAG 2.2 A or AA fails. A scan waits until every finite animation has finished, as the story tests do.

## Consequences

- The e2e job needs no secret and runs on fork and Dependabot PRs. A developer starts two containers once (README).
- The `E2E_UPSTASH_*` secrets are deleted under Actions and Dependabot once the open Dependabot PRs run on the new workflow.
- A screen change is a baseline update in the same PR, from the job's artifact.
