"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { acceptInvitationAction } from "@/server/household/actions";
import { Button } from "@/components/ui/button";

export function AcceptInviteButton({ token }: { token: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await acceptInvitationAction(token);
          if (result?.error) {
            toast.error(result.error);
          }
        });
      }}
    >
      {pending ? "Aceitando..." : "Aceitar convite"}
    </Button>
  );
}
