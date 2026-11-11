import { fileURLToPath } from "node:url";

function stub(file: string): string {
  return fileURLToPath(new URL(file, import.meta.url));
}

// Shared by vitest.config.mts (unit and dom) and vitest.integration.config.mts:
// the `@/` paths, the empty `server-only` stub, so queries, services and routes
// import in node, and the stub of `@/lib/sentry`, so a module that logs does
// not load the Sentry SDK. The Sentry pattern ends at the name: `@/lib/sentry-scrub`
// is the real file.
export const sharedResolve = {
  tsconfigPaths: true,
  alias: [
    { find: "server-only", replacement: stub("./test/server-only.ts") },
    { find: /^@\/lib\/sentry$/, replacement: stub("./test/sentry.ts") },
  ],
};
