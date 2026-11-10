// The direct endpoints of the two Neon branches. A hostname is not a
// credential, so they live in git, where a change to them is reviewed. Moving
// a branch to a new endpoint means changing the line here.
export const DEV_DATABASE_HOST =
  "ep-calm-voice-b4zvdl6z.c-6.us-east-2.aws.neon.tech";
export const PROD_DATABASE_HOST =
  "ep-twilight-hat-b4ay1zs8.c-6.us-east-2.aws.neon.tech";

const POOLER_SUFFIX = /^([^.]+)-pooler\./;

// Neon names the pooled host of an endpoint by adding `-pooler` to its first
// label. Stripping it gives the same endpoint for both forms.
export function endpointHost(hostname: string): string {
  return hostname.replace(POOLER_SUFFIX, "$1.");
}

export function isPoolerHost(hostname: string): boolean {
  return POOLER_SUFFIX.test(hostname);
}
