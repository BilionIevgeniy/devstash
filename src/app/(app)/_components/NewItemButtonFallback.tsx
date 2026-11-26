"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// The look of the top bar's create controls while the plan is read, as a
// placeholder of the rule "No flash of the wrong state": no control, nothing to
// reach or to hear. A client component: its words come from the provider, so
// the fallback reads no request (ADR 0037 addendum).
export function NewItemButtonFallback() {
  const t = useTranslations("shell");

  return (
    <span aria-hidden="true" className="pointer-events-none contents">
      <span className={cn(buttonVariants(), "hidden sm:inline-flex")}>
        <Plus />
        <span>{t("newItem")}</span>
      </span>
      <span className={cn(buttonVariants({ size: "icon" }), "sm:hidden")}>
        <Plus />
      </span>
    </span>
  );
}
