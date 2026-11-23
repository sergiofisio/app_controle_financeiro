"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { updateProfileAction } from "@/server/household/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProfileForm({
  defaultName,
}: {
  defaultName: string;
}) {
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateProfileAction(formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Perfil atualizado.");
    });
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" name="name" defaultValue={defaultName} required />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Salvar perfil"}
      </Button>
    </form>
  );
}
