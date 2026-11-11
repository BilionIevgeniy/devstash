import { getDefaultIntegrations } from "@sentry/nextjs";
import { describe, expect, it } from "vitest";

// The real SDK, not a mock. lib/sentry-server.ts removes integrations by name
// and the SDK adds its own, so a name that appears, goes or changes in a new
// version changes what the server can send without a line of ours changing, and
// none of the other tests would see it. A Dependabot PR for @sentry/nextjs that
// fails here is the prompt to repeat the check of what leaves the app, and to
// decide for each new name whether it may stay (ADR 0016). The list depends on
// the Node.js version, which .nvmrc, `engines` and Vercel pin together.
const NODE_DEFAULTS = [
  "AwsLambdaWeb",
  "ChildProcess",
  "Console",
  "Context",
  "ContextLines",
  "ConversationId",
  "Dedupe",
  "EventFilters",
  "Express",
  "Fastify",
  "FunctionToString",
  "Hapi",
  "Hono",
  "Http",
  "Koa",
  "LinkedErrors",
  "LocalVariablesAsync",
  "Modules",
  "Nitro",
  "NodeFetch",
  "NodeSystemError",
  "OnUncaughtException",
  "OnUnhandledRejection",
  "ProcessSession",
  "RequestData",
  "WorkerThreads",
];

describe("the default integrations of the server SDK", () => {
  const names = getDefaultIntegrations({})
    .map(({ name }) => name)
    .sort();

  it("are the ones this version was checked with", () => {
    expect(names).toEqual(NODE_DEFAULTS);
  });

  it("still include the two that initSentryServer removes by name", () => {
    expect(names).toContain("Http");
    expect(names).toContain("ProcessSession");
  });
});
