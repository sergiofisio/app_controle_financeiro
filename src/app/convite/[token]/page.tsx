import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { AcceptInviteButton } from "@/features/household/accept-invite-button";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { formatDateTime } from "@/lib/format";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const dynamic = "force-dynamic";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await getSession();
  const invitation = await prisma.householdInvitation.findUnique({
    where: { token },
    include: { household: true },
  });

  if (!invitation) {
    return (
      <AuthShell title="Convite inválido" subtitle="Este link não existe.">
        <Alert>
          <AlertTitle>Não encontrado</AlertTitle>
          <AlertDescription>
            Peça um novo convite ao administrador da família.
          </AlertDescription>
        </Alert>
      </AuthShell>
    );
  }

  const expired = invitation.expiresAt < new Date();
  const used = Boolean(invitation.acceptedAt);

  return (
    <AuthShell
      title="Convite para família"
      subtitle={`Você foi convidado para ${invitation.household.name}.`}
    >
      <div className="space-y-4">
        <div className="rounded-lg border bg-muted/40 p-3 text-sm">
          <p>
            <span className="text-muted-foreground">Família:</span>{" "}
            {invitation.household.name}
          </p>
          <p>
            <span className="text-muted-foreground">Papel:</span>{" "}
            {invitation.role === "ADMIN" ? "Administrador" : "Membro"}
          </p>
          <p>
            <span className="text-muted-foreground">Expira em:</span>{" "}
            {formatDateTime(invitation.expiresAt)}
          </p>
        </div>

        {used ? (
          <Alert>
            <AlertTitle>Convite já utilizado</AlertTitle>
            <AlertDescription>
              Este link de uso único já foi aceito.
            </AlertDescription>
          </Alert>
        ) : null}

        {expired && !used ? (
          <Alert>
            <AlertTitle>Convite expirado</AlertTitle>
            <AlertDescription>
              Solicite um novo link ao administrador.
            </AlertDescription>
          </Alert>
        ) : null}

        {!session ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Faça login ou cadastre-se para aceitar o convite.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/login?next=${encodeURIComponent(`/convite/${token}`)}`}
                className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground"
              >
                Entrar
              </Link>
              <Link
                href={`/cadastro?next=${encodeURIComponent(`/convite/${token}`)}`}
                className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium"
              >
                Criar conta
              </Link>
            </div>
          </div>
        ) : !used && !expired ? (
          <AcceptInviteButton token={token} />
        ) : null}
      </div>
    </AuthShell>
  );
}
