# Current Feature: Editor Preferences Settings

## Status

In Progress

## Goals

- Editor preferences section on the settings page
- Font size dropdown
- Tab size dropdown
- Word wrap toggle (default: on)
- Minimap toggle (default: off)
- Theme dropdown: vs-dark, monokai, github-dark (default: vs-dark)
- Preferences stored in the database through a migration (never `db push`)
- Server action to update preferences
- Settings applied to the Monaco editor component
- Auto-save on change (no save button), with a success toast on save
- EditorPreferencesContext for client components

## Notes

- Spec: `context/features/editor-settings-spec.md`
- Storage conflict: the spec says a JSON column `editorPreferences` on User. `docs/modules.md` plans a `UserPreference` model owned by `editor` instead: one row per user, typed columns, an absent row means defaults, created by upsert. `context/architecture-rules.md` wins over specs, so the plan follows `UserPreference`
- Placement from `docs/modules.md`: `EditorPreferencesProvider` mounted in `app/(app)/layout.tsx`, `EditorPreferencesSection` in `editor`, composed by the settings page. `editor` will use `auth`

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
