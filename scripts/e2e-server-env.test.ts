import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildE2eServerEnv } from "./e2e-server-env";

const INPUT = {
  origin: "http://localhost:3100",
  port: 3100,
  databaseUrl: "postgresql://postgres@localhost:5433/devstash_test",
  upstashUrl: "https://e2e.example.upstash.io",
  upstashToken: "upstash-token",
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

  it("points the server at the test database, the test origin and the given Upstash", () => {
    const env = buildE2eServerEnv(INPUT);

    expect(env).toMatchObject({
      DATABASE_URL: INPUT.databaseUrl,
      DIRECT_URL: INPUT.databaseUrl,
      AUTH_URL: INPUT.origin,
      APP_URL: INPUT.origin,
      PORT: "3100",
      UPSTASH_REDIS_REST_URL: INPUT.upstashUrl,
      UPSTASH_REDIS_REST_TOKEN: INPUT.upstashToken,
    });
  });

  it("gives every other vendor key a dummy, never a passed-through value", () => {
    const env = buildE2eServerEnv(INPUT);
    const vendorKeys = Object.keys(env).filter(
      (name) =>
        /^(RESEND|OPENAI|STRIPE|R2|AUTH_GITHUB)_/.test(name) ||
        name === "SEED_DEMO_PASSWORD",
    );

    expect(vendorKeys.length).toBeGreaterThan(0);
    for (const name of vendorKeys) {
      expect(env[name], name).toMatch(/dummy|devstash\.test/);
    }
  });

  it("never lets the legal pages treat the run as production", () => {
    expect(buildE2eServerEnv(INPUT).VERCEL_ENV).not.toBe("production");
  });
});
