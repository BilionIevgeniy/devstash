# 0006. Stay on ESLint 9 because of `eslint-plugin-import`

- Status: accepted
- Date: 2026-10-29

## Context

The boundary rules in [ADR 0002](0002-boundaries-enforced-by-eslint.md) rest on `eslint-plugin-import` (`import/no-restricted-paths` and `import/no-cycle`). The plugin comes in through `eslint-config-next`. Its peer range ends at ESLint 9 (version 2.32.0, the latest on npm when this was written). `package.json` pins `eslint` to `^9`.

## Options

1. **Move to ESLint 10 now.** Not possible without the plugin supporting it.
2. **Stay on ESLint 9 until the plugin supports 10.**
3. **Replace the plugin** with `eslint-plugin-boundaries` (it declares `eslint >=6`), `dependency-cruiser` or ArchUnitTS. None of them was evaluated against these rules, and it was not checked whether they can replace `import/no-cycle`.

## Decision

Option 2. The cost of a later switch is small on purpose: `FEATURE_RANKS` is plain data, so a change of plugin replaces only the code in `eslint.config.mjs` that generates the zones, not the rules themselves.

Revisit when the plugin releases ESLint 10 support, or when ESLint 9 stops receiving security fixes. In the second case the fallback is option 3, and a first step is an evaluation of the three tools against the zones in the config.

## Consequences

- No upgrade may bump `eslint` to 10 until the plugin supports it
- The rules do not depend on the choice of plugin, only the generator does
