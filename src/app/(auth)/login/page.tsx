import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/features/auth/login-form";

export default function LoginPage() {
  return (
    <AuthShell
      title="Entrar"
      subtitle="Acesse as finanças da sua família com segurança."
    >
      <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando...</p>}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
