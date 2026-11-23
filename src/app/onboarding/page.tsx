import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { CreateHouseholdForm } from "@/features/household/create-household-form";
import { getMembership, requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const session = await requireSession();
  const membership = await getMembership(session.user.id);
  if (membership) {
    redirect("/");
  }

  return (
    <AuthShell
      title="Criar sua família"
      subtitle="Você será o administrador e poderá convidar outros membros."
    >
      <CreateHouseholdForm />
    </AuthShell>
  );
}
