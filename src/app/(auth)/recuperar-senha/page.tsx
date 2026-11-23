import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/features/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Recuperar senha"
      subtitle="Sem serviço de e-mail pago: geramos um link para você copiar e usar."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
