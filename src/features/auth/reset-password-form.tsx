"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";
import { resetPasswordSchema } from "@/features/auth/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FormValues = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [pending, setPending] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  if (!token) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-destructive">
          Token inválido ou ausente. Solicite um novo link de recuperação.
        </p>
        <Link
          href="/recuperar-senha"
          className="text-sm font-medium text-sky-700 hover:underline dark:text-sky-300"
        >
          Gerar novo link
        </Link>
      </div>
    );
  }

  async function onSubmit(values: FormValues) {
    setPending(true);
    const { error } = await authClient.resetPassword({
      newPassword: values.password,
      token: token!,
    });
    setPending(false);

    if (error) {
      toast.error(error.message ?? "Não foi possível redefinir a senha.");
      return;
    }

    toast.success("Senha atualizada. Faça login.");
    router.push("/login");
  }

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="space-y-2">
        <Label htmlFor="password">Nova senha</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          {...form.register("password")}
        />
        {form.formState.errors.password ? (
          <p className="text-sm text-destructive">
            {form.formState.errors.password.message}
          </p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          {...form.register("confirmPassword")}
        />
        {form.formState.errors.confirmPassword ? (
          <p className="text-sm text-destructive">
            {form.formState.errors.confirmPassword.message}
          </p>
        ) : null}
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Salvando..." : "Redefinir senha"}
      </Button>
    </form>
  );
}
