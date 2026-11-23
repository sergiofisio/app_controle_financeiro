"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";
import { getLatestPasswordResetLink } from "@/server/auth/actions";
import { forgotPasswordSchema } from "@/features/auth/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type FormValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const [pending, setPending] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: FormValues) {
    setPending(true);
    setResetUrl(null);

    const { error } = await authClient.requestPasswordReset({
      email: values.email,
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });

    if (error) {
      setPending(false);
      toast.error(error.message ?? "Não foi possível gerar o link.");
      return;
    }

    const url = await getLatestPasswordResetLink(values.email);
    setPending(false);

    if (!url) {
      toast.message(
        "Se o e-mail existir, um link foi gerado. Sem SMTP, confirme no banco AuthShareLink.",
      );
      return;
    }

    setResetUrl(url);
    toast.success("Link de recuperação gerado para cópia manual.");
  }

  return (
    <div className="space-y-4">
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            {...form.register("email")}
          />
          {form.formState.errors.email ? (
            <p className="text-sm text-destructive">
              {form.formState.errors.email.message}
            </p>
          ) : null}
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Gerando..." : "Gerar link de recuperação"}
        </Button>
      </form>

      {resetUrl ? (
        <Alert>
          <AlertTitle>Link para compartilhar manualmente</AlertTitle>
          <AlertDescription className="break-all">{resetUrl}</AlertDescription>
          <Button
            type="button"
            variant="outline"
            className="mt-3"
            onClick={async () => {
              await navigator.clipboard.writeText(resetUrl);
              toast.success("Link copiado.");
            }}
          >
            Copiar link
          </Button>
        </Alert>
      ) : null}

      <p className="text-center text-sm text-muted-foreground">
        <Link
          href="/login"
          className="font-medium text-sky-700 hover:underline dark:text-sky-300"
        >
          Voltar ao login
        </Link>
      </p>
    </div>
  );
}
