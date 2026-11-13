import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/features/auth/nextauth/auth";

// For pages and Server Actions: a signed-out caller is sent to sign-in.
export const getSessionUser = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");
  return session.user;
});

// For a route answered with fetch (or an action with its own refusal text):
// null when signed out, never a redirect, so the caller answers 401 itself.
export const getSignedInUserId = cache(async (): Promise<string | null> => {
  const session = await auth();
  return session?.user?.id ?? null;
});
