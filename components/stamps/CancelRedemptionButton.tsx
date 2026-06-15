"use client";

import { useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { cancelRedemptionAction } from "@/app/[locale]/account/(protected)/stamps/actions";

export function CancelRedemptionButton({ id, label }: { id: string; label: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={pending}
      onClick={() => start(async () => {
        await cancelRedemptionAction(id);
        router.refresh();
      })}
    >
      {label}
    </Button>
  );
}
