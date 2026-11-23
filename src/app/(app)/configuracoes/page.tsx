import { formatDateTime } from "@/lib/format";
import {
  listHouseholdMembers,
  listPendingInvitations,
} from "@/server/household/actions";
import { requireMembership } from "@/lib/session";
import { ChangePasswordForm } from "@/features/auth/change-password-form";
import { InviteForm } from "@/features/household/invite-form";
import { ProfileForm } from "@/features/household/profile-form";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function SettingsPage() {
  const { session, membership } = await requireMembership();
  const [members, invitations] = await Promise.all([
    listHouseholdMembers(),
    listPendingInvitations(),
  ]);
  const isAdmin = membership.role === "ADMIN";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Configurações
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Perfil, senha, membros e convites da família.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card id="perfil">
          <CardHeader>
            <CardTitle>Perfil</CardTitle>
            <CardDescription>{session.user.email}</CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm defaultName={session.user.name} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alterar senha</CardTitle>
            <CardDescription>
              As demais sessões serão encerradas após a troca.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Membros da família</CardTitle>
          <CardDescription>{membership.household.name}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Papel</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>{member.user.name}</TableCell>
                  <TableCell>{member.user.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {member.role === "ADMIN" ? "Administrador" : "Membro"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {isAdmin ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Convidar membro</CardTitle>
              <CardDescription>
                Gere um link seguro de uso único para compartilhar manualmente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InviteForm />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Convites pendentes</CardTitle>
              <CardDescription>
                {invitations.length === 0
                  ? "Nenhum convite ativo."
                  : `${invitations.length} convite(s) aguardando aceite.`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {invitations.map((invite) => (
                <div
                  key={invite.id}
                  className="rounded-lg border p-3 text-sm"
                >
                  <p className="font-medium">
                    {invite.email ?? "Sem e-mail restrito"}
                  </p>
                  <p className="text-muted-foreground">
                    Expira em {formatDateTime(invite.expiresAt)}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
