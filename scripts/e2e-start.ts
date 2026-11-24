import { spawn } from "node:child_process";
import { createWriteStream, mkdirSync } from "node:fs";
import { dirname } from "node:path";

// Starts the production server of the end-to-end tests (`next start`) and
// writes everything it prints to SERVER_LOG as well as to its own output, so
// e2e/egress.spec.ts can read the server's log the way Vercel would keep it.
// playwright.config.ts runs it after the build.

export const SERVER_LOG = "playwright/server.log";

function main() {
  mkdirSync(dirname(SERVER_LOG), { recursive: true });
  const log = createWriteStream(SERVER_LOG, { flags: "w" });
  const server = spawn("npx", ["next", "start", "--hostname", "localhost"], {
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
  });
  server.stdout.on("data", (chunk: Buffer) => {
    log.write(chunk);
    process.stdout.write(chunk);
  });
  server.stderr.on("data", (chunk: Buffer) => {
    log.write(chunk);
    process.stderr.write(chunk);
  });
  const stop = () => server.kill("SIGTERM");
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
  server.on("exit", (code) => {
    log.end();
    process.exit(code ?? 0);
  });
}

if (process.argv[1]?.endsWith("e2e-start.ts")) main();
