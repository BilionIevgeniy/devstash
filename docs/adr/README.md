# Architecture decision records

One short file per decision that shapes the structure of the code, in the [MADR](https://adr.github.io/madr/) form: context, options, the decision and its consequences. The rules that follow from a decision are in [context/architecture-rules.md](../../context/architecture-rules.md); the record says why they are the way they are.

| No. | Decision | Status |
| --- | -------- | ------ |
| [0001](0001-modular-monolith-with-ranked-features.md) | Modular monolith with ranked features | accepted |
| [0002](0002-boundaries-enforced-by-eslint.md) | Boundaries are enforced by ESLint | accepted |
| [0003](0003-services-for-every-write.md) | Every write goes through a service | accepted |
| [0004](0004-direct-upload-to-r2.md) | Files go from the browser straight to R2 | accepted |
| [0005](0005-entitlements-from-the-database.md) | Entitlements come from the database, and billing owns its data | accepted |
| [0006](0006-eslint-9-and-eslint-plugin-import.md) | Stay on ESLint 9 because of `eslint-plugin-import` | accepted |

## How to add one

1. Copy the shape of an existing record and use the next number: `NNNN-short-title.md`.
2. Write it when a rule in the architecture rules changes or a new one is added, before the change lands. If a rule blocks you, write a record that changes the rule; do not work around it.
3. Statuses: `proposed`, `accepted`, `superseded by NNNN`. An accepted record is not edited afterwards except for its status; a new record replaces it.
