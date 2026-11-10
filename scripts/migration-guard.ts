import {
  DEV_DATABASE_HOST,
  PROD_DATABASE_HOST,
  endpointHost,
  isPoolerHost,
} from "./neon-endpoints";

// Each Vercel environment migrates its own database and nothing else: the
// hosts are an allowlist, so a wrong endpoint in the env settings fails the
// build instead of migrating it.
const EXPECTED_HOST = {
  production: PROD_DATABASE_HOST,
  preview: DEV_DATABASE_HOST,
} as const;

type MigratingEnv = keyof typeof EXPECTED_HOST;

interface MigrationEnv {
  vercelEnv: string | undefined;
  directUrl: string | undefined;
  databaseUrl: string | undefined;
}

export type MigrationDecision =
  | { migrate: true; vercelEnv: MigratingEnv; host: string }
  | { migrate: false; reason: string };

function refuse(reason: string): MigrationDecision {
  return { migrate: false, reason };
}

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isMigratingEnv(value: string | undefined): value is MigratingEnv {
  return value === "production" || value === "preview";
}

// Reasons name hosts only, never a full URL, so a password never reaches the
// build log.
export function decideMigration({
  vercelEnv,
  directUrl,
  databaseUrl,
}: MigrationEnv): MigrationDecision {
  if (!isMigratingEnv(vercelEnv)) {
    return refuse(
      `VERCEL_ENV is ${vercelEnv ?? "not set"}, expected production or preview`,
    );
  }
  const direct = directUrl ? parseUrl(directUrl) : null;
  const pooled = databaseUrl ? parseUrl(databaseUrl) : null;
  if (!direct || !pooled) {
    return refuse("DIRECT_URL and DATABASE_URL must both be valid URLs");
  }
  if (isPoolerHost(direct.hostname)) {
    return refuse(
      `DIRECT_URL must be the direct endpoint, not ${direct.hostname}`,
    );
  }
  const host = endpointHost(direct.hostname);
  if (
    host !== endpointHost(pooled.hostname) ||
    direct.pathname !== pooled.pathname
  ) {
    return refuse("DIRECT_URL and DATABASE_URL point at different databases");
  }
  const expected = EXPECTED_HOST[vercelEnv];
  if (host !== expected) {
    return refuse(`${vercelEnv} must migrate ${expected}, not ${host}`);
  }
  return { migrate: true, vercelEnv, host };
}
