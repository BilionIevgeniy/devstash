import { Suspense } from "react";
import { probeError, readProbeSecrets } from "../probe";

// A Server Action that throws. It checks no session, unlike every action of
// the app: it exists only in the end-to-end build and reads nothing.
async function failAction(formData: FormData): Promise<void> {
  "use server";
  throw probeError("Action", {
    token: String(formData.get("token") ?? ""),
    email: String(formData.get("email") ?? ""),
    title: String(formData.get("title") ?? ""),
  });
}

async function ActionForm({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const secrets = readProbeSecrets(new URLSearchParams(await searchParams));
  return (
    <form action={failAction}>
      <input type="hidden" name="token" value={secrets.token} />
      <input type="hidden" name="email" value={secrets.email} />
      <input type="hidden" name="title" value={secrets.title} />
      <button type="submit">Run the action</button>
    </form>
  );
}

export default function ActionThrowPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  return (
    <Suspense>
      <ActionForm searchParams={searchParams} />
    </Suspense>
  );
}
