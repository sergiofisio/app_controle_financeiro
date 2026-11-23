"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createInvitationAction } from "@/server/household/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function InviteForm() {
  const [pending, startTransition] = useTransition();
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createInvitationAction(formData);
      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      if ("inviteUrl" in result && result.inviteUrl) {
        setInviteUrl(result.inviteUrl);
        toast.success("Convite gerado. Compartilhe o link manualmente.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <form action={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">E-mail do convidado (opcional)</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="opcional@email.com"
          />
          <p className="text-xs text-muted-foreground">
            Se informar e-mail, só essa pessoa poderá aceitar o convite.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="daysValid">Validade (dias)</Label>
          <Input
            id="daysValid"
            name="daysValid"
            type="number"
            min={1}
            max={30}
            defaultValue={7}
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Gerando..." : "Gerar link de convite"}
        </Button>
      </form>

      {inviteUrl ? (
        <Alert>
          <AlertTitle>Link de convite (uso único)</AlertTitle>
          <AlertDescription className="break-all">{inviteUrl}</AlertDescription>
          <Button
            type="button"
            variant="outline"
            className="mt-3"
            onClick={async () => {
              await navigator.clipboard.writeText(inviteUrl);
              toast.success("Link copiado.");
            }}
          >
            Copiar link
          </Button>
        </Alert>
      ) : null}
    </div>
  );
}
