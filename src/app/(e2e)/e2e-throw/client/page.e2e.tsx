import { Suspense } from "react";
import { ClientThrows } from "./ClientThrows.e2e";

export default function ClientThrowPage() {
  return (
    <Suspense>
      <ClientThrows />
    </Suspense>
  );
}
