// The endpoint of the `development` branch in Neon. A script that deletes data
// runs only there, so a .env pointed at production stops it before any query.
const DEV_DATABASE_HOST = "ep-calm-voice-b4zvdl6z.c-6.us-east-2.aws.neon.tech";

export function requireDevDatabase(connectionString: string): void {
  const host = new URL(connectionString).hostname;
  if (host !== DEV_DATABASE_HOST) {
    throw new Error(`Refusing to run: ${host} is not the development database`);
  }
}
