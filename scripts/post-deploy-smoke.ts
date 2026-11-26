// What a production deployment must answer once it is live: run by
// .github/workflows/post-deploy.yml after Vercel reports a successful
// production deployment, against the live domain. A red run means the site is
// broken for visitors although the build passed (a missing variable, a route
// that throws at runtime). No imports, so Node runs it as it is, with no
// install: the checks are pure and unit-tested.

export interface Expectation {
  path: string;
  status: number;
  /** For a redirect, where it must lead (the start of the Location). */
  location?: string;
  /** Headers that must be present. */
  headers?: string[];
  /** Text the body must contain. */
  body?: string;
}

export interface Answer {
  status: number;
  headers: Record<string, string>;
  body: string;
}

export const EXPECTATIONS: Expectation[] = [
  {
    path: "/",
    status: 200,
    headers: ["content-security-policy", "strict-transport-security"],
    body: "DevStash",
  },
  { path: "/de", status: 200, body: "DevStash" },
  { path: "/sign-in", status: 200, body: "<form" },
  { path: "/register", status: 200, body: "<form" },
  { path: "/dashboard", status: 307, location: "/sign-in" },
  // Auth.js answers with its secret and database in place.
  { path: "/api/auth/session", status: 200, body: "null" },
  { path: "/impressum", status: 200 },
  { path: "/robots.txt", status: 200, body: "Sitemap:" },
];

// What is wrong with an answer, or nothing.
export function problemsOf(expected: Expectation, answer: Answer): string[] {
  const problems: string[] = [];
  if (answer.status !== expected.status) {
    problems.push(`status ${answer.status}, expected ${expected.status}`);
  }
  if (expected.location) {
    const location = answer.headers.location ?? "";
    const path = location.startsWith("http")
      ? new URL(location).pathname
      : location.split("?")[0];
    if (!path.startsWith(expected.location)) {
      problems.push(
        `redirects to "${location}", expected ${expected.location}`,
      );
    }
  }
  for (const header of expected.headers ?? []) {
    if (!answer.headers[header]) problems.push(`no ${header} header`);
  }
  if (expected.body && !answer.body.includes(expected.body)) {
    problems.push(`the body lacks "${expected.body}"`);
  }
  return problems;
}

const ATTEMPTS = 5;
const WAIT_MS = 15_000;

async function answerOf(origin: string, path: string): Promise<Answer> {
  const response = await fetch(new URL(path, origin), { redirect: "manual" });
  return {
    status: response.status,
    headers: Object.fromEntries(response.headers),
    body: await response.text(),
  };
}

async function failures(origin: string): Promise<string[]> {
  const found: string[] = [];
  for (const expected of EXPECTATIONS) {
    try {
      const problems = problemsOf(
        expected,
        await answerOf(origin, expected.path),
      );
      found.push(...problems.map((problem) => `${expected.path}: ${problem}`));
    } catch (error) {
      found.push(`${expected.path}: ${(error as Error).message}`);
    }
  }
  return found;
}

// The domain may still point at the deployment before for a few seconds, and
// a cold function may answer slowly: a failed round is repeated.
async function main(): Promise<void> {
  const origin = process.env.SMOKE_ORIGIN;
  if (!origin) throw new Error("SMOKE_ORIGIN is not set");
  for (let attempt = 1; ; attempt++) {
    const found = await failures(origin);
    if (found.length === 0) {
      console.log(`${origin}: all ${EXPECTATIONS.length} checks passed`);
      return;
    }
    if (attempt === ATTEMPTS) {
      for (const failure of found) console.error(failure);
      process.exitCode = 1;
      return;
    }
    console.log(`Attempt ${attempt}: ${found.length} failed, again soon`);
    await new Promise((resolve) => setTimeout(resolve, WAIT_MS));
  }
}

if (process.argv[1]?.endsWith("post-deploy-smoke.ts")) await main();
