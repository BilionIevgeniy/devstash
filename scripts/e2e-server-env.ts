import { FAKE_OPENAI_PORT } from "./fake-openai";
import { FAKE_R2_ENDPOINT } from "./fake-r2";
import { FAKE_SENTRY_DSN } from "./fake-sentry";
import { FAKE_UPSTASH_URL, SRH_TOKEN } from "./fake-upstash";

// The environment of the server the end-to-end tests start (`npm run build`,
// then `npm run start`). Playwright puts it over the environment of the test
// run, and Next reads .env, .env.local, .env.production and
// .env.production.local beneath both: a variable that is not named here keeps
// the value of the developer's shell or of those files, which can be a live
// Stripe, Resend, OpenAI or R2 key. So every variable of .env.example is
// named, and a test fails for one that is not.

export interface E2eServerEnvInput {
  /** Where the test server listens, such as http://localhost:3100. */
  origin: string;
  port: number;
  /** A database that has passed requireTestDatabase. */
  databaseUrl: string;
}

const DUMMY = "e2e-dummy-not-a-real-key";

export function buildE2eServerEnv({
  origin,
  port,
  databaseUrl,
}: E2eServerEnvInput): Record<string, string> {
  return {
    NODE_ENV: "production",
    PORT: String(port),
    NEXT_TELEMETRY_DISABLED: "1",
    // Not "production", which a pulled .env.production may carry: the legal
    // pages fail the build while they hold placeholders, and only then.
    VERCEL_ENV: "development",
    DATABASE_URL: databaseUrl,
    DIRECT_URL: databaseUrl,
    SEED_DEMO_PASSWORD: DUMMY,
    AUTH_SECRET: "e2e-auth-secret-not-used-anywhere",
    AUTH_URL: origin,
    APP_URL: origin,
    AUTH_GITHUB_ID: DUMMY,
    AUTH_GITHUB_SECRET: DUMMY,
    RESEND_API_KEY: DUMMY,
    EMAIL_FROM: "DevStash <noreply@devstash.test>",
    // The local stand-in (scripts/fake-upstash.ts), never a real Upstash
    // database, and never SRH directly, which would skip the script rewrite.
    UPSTASH_REDIS_REST_URL: FAKE_UPSTASH_URL,
    UPSTASH_REDIS_REST_TOKEN: SRH_TOKEN,
    RATE_LIMIT_HASH_KEY: "e2e-rate-limit-hash-key-not-used-anywhere",
    CRON_SECRET: "e2e-cron-secret-not-used-anywhere",
    R2_ACCOUNT_ID: DUMMY,
    R2_ACCESS_KEY_ID: DUMMY,
    R2_SECRET_ACCESS_KEY: DUMMY,
    R2_BUCKET_NAME: DUMMY,
    // The local stand-in (scripts/fake-r2.ts); r2.ts takes only localhost.
    R2_ENDPOINT: FAKE_R2_ENDPOINT,
    STRIPE_SECRET_KEY: DUMMY,
    STRIPE_WEBHOOK_SECRET: DUMMY,
    STRIPE_PRICE_ID_MONTHLY: DUMMY,
    STRIPE_PRICE_ID_YEARLY: DUMMY,
    OPENAI_API_KEY: DUMMY,
    // Read by the OpenAI SDK itself: the AI calls go to the local fake
    // (scripts/fake-openai.ts), never to the real API. Not in .env.example,
    // since the app never reads it.
    OPENAI_BASE_URL: `http://localhost:${FAKE_OPENAI_PORT}/v1`,
    // Empty on purpose: no DSN keeps the SDK off, and no token means the build
    // uploads nothing and generates no source maps.
    // The stand-in ingest (scripts/fake-sentry.ts), in the bundle and on the
    // server, for e2e/egress.spec.ts.
    NEXT_PUBLIC_SENTRY_DSN: FAKE_SENTRY_DSN,
    SENTRY_DSN: FAKE_SENTRY_DSN,
    // Compiles the throw routes of src/app/(e2e)/ (scripts/e2e-build.ts).
    E2E_BUILD: "1",
    SENTRY_AUTH_TOKEN: "",
    SENTRY_ORG: "",
    SENTRY_PROJECT: "",
  };
}
