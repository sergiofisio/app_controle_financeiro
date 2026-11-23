"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { resetFinancialAccountAction } from "@/server/accounts/actions";
import { Button } from "@/components/ui/button";

export function ResetAccountButton({
  accountId,
  accountName,
}: {
  accountId: string;
  accountName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      className="text-destructive hover:text-destructive"
      onClick={() => {
        const ok = window.confirm(
          `Limpar todos os lançamentos e importações de "${accountName}"?\n\nO cadastro da conta permanece; saldos voltam a zero. Esta ação não pode ser desfeita.`,
        );
        if (!ok) return;
        startTransition(async () => {
          const result = await resetFinancialAccountAction(accountId);
          if (result?.error) {
            toast.error(result.error);
            return;
          }
          toast.success("Conta limpa. Saldo zerado.");
          router.refresh();
        });
      }}
    >
      {pending ? "Limpando..." : "Limpar lançamentos"}
    </Button>
  );
}
