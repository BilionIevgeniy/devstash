# Current Feature: Functions and database closer to the users

Spec: context/features/24.region-closer-to-users.md

## Status

In Progress

## Goals

- The functions run in `fra1` and the database is the Neon project `devstash-eu` in `aws-eu-central-1`, both switched in one release
- Production and development are copied with no row lost, and a check of the two sides proves it before the switch
- Writes are stopped while production is copied, and the rollback is written down before the switch
- Previews use the new `development` branch and the same region
- Nothing names the old region or endpoints as the current ones: the guards and their tests, `CLAUDE.md`, the privacy notice in both languages, the processing record
- Before and after numbers in `docs/performance.md`, the decision in an ADR

## Notes

- New project `lively-wildflower-46234559`; development `br-raspy-sound-bh0suynz`; hosts in the spec. Old project `purple-voice-82062641` stays as the rollback until the owner deletes it
- The owner runs the copy (it needs passwords, and production is never read by Claude) and sets the Vercel variables when told; no connection string enters the conversation
- Upstash is already in `eu-central-1`
- Non-goals: multi-region, a read replica, an edge runtime

## Model

- Plan: opus (a data migration and vendor settings: first row)
- Implementation: opus (same row)
- architecture-reviewer: opus

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
