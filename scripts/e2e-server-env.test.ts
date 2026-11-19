import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildE2eServerEnv } from "./e2e-server-env";

const INPUT = {
  origin: "http://localhost:3100",
  port: 3100,
  databaseUrl: "postgresql://postgres@localhost:5433/devstash_test",
};

// The names the app documents; a new one must get a decision here.
function variablesOfEnvExample(): string[] {
  const text = readFileSync(
    new URL("../.env.example", import.meta.url),
    "utf8",
  );
  return [...text.matchAll(/^([A-Z0-9_]+)=/gm)].map(([, name]) => name);
}

describe("buildE2eServerEnv", () => {
  it("names every variable of .env.example, so none falls through to a live value", () => {
    const env = buildE2eServerEnv(INPUT);

    const unnamed = variablesOfEnvExample().filter((name) => !(name in env));

    expect(unnamed).toEqual([]);
  });

  it("points the server at the test database, the test origin and the local Upstash stand-in", () => {
    const env = buildE2eServerEnv(INPUT);

    expect(env).toMatchObject({
      DATABASE_URL: INPUT.databaseUrl,
      DIRECT_URL: INPUT.databaseUrl,
      AUTH_URL: INPUT.origin,
      APP_URL: INPUT.origin,
      PORT: "3100",
      UPSTASH_REDIS_REST_URL: "http://localhost:3103",
      UPSTASH_REDIS_REST_TOKEN: "e2e-local-redis-token",
    });
  });

  it("gives every other vendor key a dummy, never a passed-through value", () => {
    const env = buildE2eServerEnv(INPUT);
    const vendorKeys = Object.keys(env).filter(
      (name) =>
        (/^(RESEND|OPENAI|STRIPE|R2|AUTH_GITHUB)_/.test(name) &&
          name !== "OPENAI_BASE_URL" &&
          name !== "R2_ENDPOINT") ||
        name === "SEED_DEMO_PASSWORD",
    );

    expect(vendorKeys.length).toBeGreaterThan(0);
    for (const name of vendorKeys) {
      expect(env[name], name).toMatch(/dummy|devstash\.test/);
    }
  });

  it("sends the AI calls to the local fake, never to the real API", () => {
    expect(buildE2eServerEnv(INPUT).OPENAI_BASE_URL).toBe(
      "http://localhost:3101/v1",
    );
  });

  it("sends the file calls to the local fake R2, never to Cloudflare", () => {
    expect(buildE2eServerEnv(INPUT).R2_ENDPOINT).toBe("http://localhost:3102");
  });

  it("keeps Sentry off: no DSN, and no token to upload source maps with", () => {
    const env = buildE2eServerEnv(INPUT);

    expect(env).toMatchObject({
      NEXT_PUBLIC_SENTRY_DSN: "",
      SENTRY_DSN: "",
      SENTRY_AUTH_TOKEN: "",
      SENTRY_ORG: "",
      SENTRY_PROJECT: "",
    });
  });

  it("never lets the legal pages treat the run as production", () => {
    expect(buildE2eServerEnv(INPUT).VERCEL_ENV).not.toBe("production");
  });
});
