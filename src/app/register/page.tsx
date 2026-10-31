import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthCard } from "@/features/auth/components/AuthCard";
import { RegisterForm } from "@/features/auth/components/RegisterForm";
import { auth } from "@/features/auth/nextauth/auth";

// A signed-in user goes to the dashboard. Checked here and not in the proxy:
// auth() also checks the session version, so a revoked session is signed out
// here instead of bouncing between the proxy and the pages.
export default async function RegisterPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <AuthCard title="Create an account" description="Start building your DevStash">
      <RegisterForm />

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/sign-in"
          className="text-foreground underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}
