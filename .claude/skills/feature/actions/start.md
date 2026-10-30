# Start Action

1. Read current-feature.md - verify Goals are populated
2. If empty, error: "Run /feature load first"
3. Set Status to "In Progress"
4. Create and checkout the feature branch (derive name from H1 heading)
5. Decide which module the code goes in, before planning any file:
   - Read `docs/modules.md`: find the module whose **First code** names this spec, and the module whose **Owns** lists what the spec builds (a component, a model, a flow)
   - Say in the plan which module each new file goes in and which line of `docs/modules.md` decides it. If no module claims it, say so, then place it by "Where does this go" in `context/architecture-rules.md` (rule 9, `_internal/`, applies only then)
   - If the spec is the first code of a planned module, the plan includes creating it: its folder, its `FEATURE_RANKS` row in `eslint.config.mjs`, its Status in the Ranks table of `context/architecture-rules.md`, and moving its section in `docs/modules.md` from "Planned modules" to "Existing modules"
6. List the goals, then implement them one by one
