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
  upstashUrl: string;
  upstashToken: string;
}

const DUMMY = "e2e-dummy-not-a-real-key";

export function buildE2eServerEnv({
  origin,
  port,
  databaseUrl,
  upstashUrl,
  upstashToken,
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
    UPSTASH_REDIS_REST_URL: upstashUrl,
    UPSTASH_REDIS_REST_TOKEN: upstashToken,
    R2_ACCOUNT_ID: DUMMY,
    R2_ACCESS_KEY_ID: DUMMY,
    R2_SECRET_ACCESS_KEY: DUMMY,
    R2_BUCKET_NAME: DUMMY,
    STRIPE_SECRET_KEY: DUMMY,
    STRIPE_WEBHOOK_SECRET: DUMMY,
    STRIPE_PRICE_ID_MONTHLY: DUMMY,
    STRIPE_PRICE_ID_YEARLY: DUMMY,
    OPENAI_API_KEY: DUMMY,
  };
}
