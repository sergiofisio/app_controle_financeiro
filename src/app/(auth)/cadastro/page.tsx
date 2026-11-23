import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/features/auth/register-form";

export default function RegisterPage() {
  return (
    <AuthShell
      title="Criar conta"
      subtitle="Comece a organizar o patrimônio familiar."
    >
      <RegisterForm />
    </AuthShell>
  );
}
