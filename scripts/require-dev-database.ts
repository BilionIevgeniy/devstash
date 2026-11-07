// The endpoint of the `development` branch in Neon. A script that deletes data
// runs only there, so a .env pointed at production stops it before any query.
const DEV_DATABASE_HOST = "ep-calm-voice-b4zvdl6z.c-6.us-east-2.aws.neon.tech";

export function isDevDatabase(connectionString: string): boolean {
  return new URL(connectionString).hostname === DEV_DATABASE_HOST;
}

export function requireDevDatabase(connectionString: string): void {
  if (!isDevDatabase(connectionString)) {
    const host = new URL(connectionString).hostname;
    throw new Error(`Refusing to run: ${host} is not the development database`);
  }
}
