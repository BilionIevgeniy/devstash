import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export const getSessionUser = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");
  return session.user;
});
