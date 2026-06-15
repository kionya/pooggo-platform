"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { cancelRedemptionAction } from "@/app/[locale]/account/(protected)/stamps/actions";

export function CancelRedemptionButton({ id, label }: { id: string; label: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  return (
    <span className="inline-flex flex-col gap-1">
      <Button
        variant="secondary"
        size="sm"
        disabled={pending}
        onClick={() => start(async () => {
          setError(null);
          const res = await cancelRedemptionAction(id);
          if (!res.ok) {
            setError(res.errors[0] ?? "Error");
          } else {
            router.refresh();
          }
        })}
      >
        {label}
      </Button>
      {error && (
        <span role="alert" className="text-xs text-clay-700">
          {error}
        </span>
      )}
    </span>
  );
}
