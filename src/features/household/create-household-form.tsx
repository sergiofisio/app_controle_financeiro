"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createHouseholdAction } from "@/server/household/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateHouseholdForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createHouseholdAction(formData);
      if (result?.error) {
        setError(result.error);
        toast.error(result.error);
      }
    });
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome da família</Label>
        <Input
          id="name"
          name="name"
          placeholder="Ex.: Família Silva"
          required
          minLength={2}
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Criando..." : "Criar família"}
      </Button>
    </form>
  );
}
