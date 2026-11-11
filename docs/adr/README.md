# Architecture decision records

One short file per decision that shapes the structure of the code, in the [MADR](https://adr.github.io/madr/) form: context, options, the decision and its consequences. The rules that follow from a decision are in [context/architecture-rules.md](../../context/architecture-rules.md); the record says why they are the way they are.

| No. | Decision | Status |
| --- | -------- | ------ |
| [0001](0001-modular-monolith-with-ranked-features.md) | Modular monolith with ranked features | accepted |
| [0002](0002-boundaries-enforced-by-eslint.md) | Boundaries are enforced by ESLint | accepted |
| [0003](0003-services-for-every-write.md) | Every write goes through a service | accepted |
| [0004](0004-direct-upload-to-r2.md) | Files go from the browser straight to R2 | accepted |
| [0005](0005-entitlements-from-the-database.md) | Entitlements come from the database, and billing owns its data | superseded by 0011 |
| [0006](0006-eslint-9-and-eslint-plugin-import.md) | Stay on ESLint 9 because of `eslint-plugin-import` | accepted |
| [0007](0007-client-hooks-in-the-components-role.md) | Client hooks belong to the components role | accepted |
| [0008](0008-items-own-the-collection-link.md) | Items own the link to collections | accepted |
| [0009](0009-read-write-split-enforced-by-lint.md) | The split between reads and writes is enforced by lint | accepted |
| [0010](0010-pagination-in-lib-and-object-key-reads-in-internal.md) | Pagination lives in `lib`, and reads of the object key in `_internal/queries.ts` | accepted |
| [0011](0011-past-due-grace-and-no-event-table.md) | Pro lasts through `past_due`, and webhooks need no event table | accepted |
| [0012](0012-webhook-writes-scoped-by-customer.md) | A webhook write is scoped by the Stripe customer, not by the user | accepted |
| [0013](0013-how-schema-changes-reach-production.md) | Schema changes reach production through a guarded migration in the Vercel build | accepted |
| [0014](0014-launch-mode.md) | Portfolio mode now, with real legal pages; what a commercial launch adds | accepted |

## How to add one

1. Copy the shape of an existing record and use the next number: `NNNN-short-title.md`.
2. Write it when a rule in the architecture rules changes or a new one is added, before the change lands. If a rule blocks you, write a record that changes the rule; do not work around it.
3. Statuses: `proposed`, `accepted`, `superseded by NNNN`. An accepted record is not edited afterwards except for its status; a new record replaces it.
