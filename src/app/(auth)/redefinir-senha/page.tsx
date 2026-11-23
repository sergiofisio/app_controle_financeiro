import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/features/auth/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Redefinir senha"
      subtitle="Defina uma nova senha para sua conta."
    >
      <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando...</p>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
