import Link from "next/link";
import { useTranslations } from "next-intl";

import { ResendVerificationButton } from "@/features/auth/components/ResendVerificationButton";

interface CheckEmailNoticeProps {
  email: string;
}

export function CheckEmailNotice({ email }: CheckEmailNoticeProps) {
  const t = useTranslations("auth.checkEmail");

  return (
    <div className="space-y-4 text-center">
      <h2 className="text-lg font-semibold">{t("title")}</h2>
      <p className="text-sm text-muted-foreground">
        {t.rich("body", {
          email,
          strong: (chunks) => (
            <span className="font-medium text-foreground">{chunks}</span>
          ),
        })}
      </p>
      <ResendVerificationButton email={email} />
      <Link
        href="/sign-in"
        className="block text-sm text-foreground underline-offset-4 hover:underline"
      >
        {t("backToSignIn")}
      </Link>
    </div>
  );
}
