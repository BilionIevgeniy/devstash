// The routes of this folder exist only in the end-to-end build: their files
// end in .e2e.tsx or .e2e.ts, which only E2E_BUILD=1 compiles
// (scripts/e2e-build.ts). Each throws an error that carries what must never
// leave the app: a token, an email address, an item title and the text of a
// Prisma-like message. e2e/egress.spec.ts asserts that none of it reaches the
// stand-in ingest or the server's log (ADR 0016). Each path has its own class,
// the one thing of an error that does leave, so the spec can count the events
// of each path.

export type ProbeKind = "Server" | "Route" | "Action" | "Render" | "Handler";

export interface ProbeSecrets {
  token: string;
  email: string;
  title: string;
}

export function readProbeSecrets(params: URLSearchParams): ProbeSecrets {
  return {
    token: params.get("token") ?? "",
    email: params.get("email") ?? "",
    title: params.get("title") ?? "",
  };
}

export function probeError(kind: ProbeKind, secrets: ProbeSecrets): Error {
  const error = new Error(
    `Invalid invocation { data: { email: "${secrets.email}", title: "${secrets.title}" } } token=${secrets.token}`,
  );
  error.name = `E2e${kind}ProbeError`;
  return error;
}
