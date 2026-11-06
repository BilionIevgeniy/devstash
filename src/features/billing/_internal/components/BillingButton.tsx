import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

interface BillingButtonProps {
  label: string;
  variant: "default" | "outline";
  isPending: boolean;
  isActive: boolean;
  onClick: () => void;
}

export function BillingButton({
  label,
  variant,
  isPending,
  isActive,
  onClick,
}: BillingButtonProps) {
  return (
    <Button variant={variant} disabled={isPending} onClick={onClick}>
      {isPending && isActive && (
        <Loader2 className="animate-spin" aria-hidden="true" />
      )}
      {label}
    </Button>
  );
}
