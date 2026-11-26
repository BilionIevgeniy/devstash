"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { DASHBOARD_PATH } from "@/features/auth/domain/auth-paths";
import { cn } from "@/lib/utils";

import { PendingLinkLabel } from "../pending/PendingLinkLabel";
import { BUTTON_TRANSITION, SessionAwareAction } from "../SessionAwareAction";

const START_BUTTON = cn("h-11 px-5 text-[15px]", BUTTON_TRANSITION);

// The main call to action of the hero and the closing section: register for
// a guest, the dashboard for a signed-in visitor.
export function StartAction({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  const t = useTranslations("marketing");
  return (
    <SessionAwareAction
      className={className}
      guest={(hidden) => (
        <Button asChild size="lg" className={START_BUTTON}>
          <Link href="/register" prefetch={hidden ? false : undefined}>
            <PendingLinkLabel>{label}</PendingLinkLabel>
          </Link>
        </Button>
      )}
      member={(hidden) => (
        <Button asChild size="lg" className={START_BUTTON}>
          <Link href={DASHBOARD_PATH} prefetch={hidden ? false : undefined}>
            <PendingLinkLabel>{t("openDashboard")}</PendingLinkLabel>
          </Link>
        </Button>
      )}
    />
  );
}
