import { Suspense, type ReactNode } from "react";
import { probeError, readProbeSecrets } from "../probe";

// A Server Component that throws while it renders.
async function Thrower({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}): Promise<ReactNode> {
  const secrets = readProbeSecrets(new URLSearchParams(await searchParams));
  throw probeError("Server", secrets);
}

export default function ServerThrowPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  return (
    <Suspense>
      <Thrower searchParams={searchParams} />
    </Suspense>
  );
}
