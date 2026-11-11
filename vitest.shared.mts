import { fileURLToPath } from "node:url";

// Shared by vitest.config.mts (unit and dom) and vitest.integration.config.mts:
// the `@/` paths and the empty `server-only` stub, so queries, services and
// routes import in node.
export const sharedResolve = {
  tsconfigPaths: true,
  alias: {
    "server-only": fileURLToPath(
      new URL("./test/server-only.ts", import.meta.url),
    ),
  },
};
