"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { uploadStatementAction } from "@/server/imports/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function UploadForm({
  accounts,
}: {
  accounts: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [headers, setHeaders] = useState<string[] | null>(null);

  return (
    <form
      className="space-y-4"
      action={(fd) => {
        startTransition(async () => {
          const result = await uploadStatementAction(fd);
          if (result && "error" in result && result.error) {
            toast.error(result.error);
            if ("detectedHeaders" in result && result.detectedHeaders) {
              setHeaders(result.detectedHeaders as string[]);
            }
            return;
          }
          if (result && "batchId" in result && result.batchId) {
            toast.success("Prévia gerada.");
            router.push(`/importar/${result.batchId}`);
          }
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="accountId">Conta</Label>
          <select
            id="accountId"
            name="accountId"
            required
            className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="file">Arquivo (CSV, OFX ou PDF textual)</Label>
          <Input
            id="file"
            name="file"
            type="file"
            accept=".csv,.txt,.ofx,.qfx,.pdf"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="delimiter">Delimitador CSV (opcional)</Label>
          <Input id="delimiter" name="delimiter" placeholder="; ou ," />
        </div>
      </div>

      {headers ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <p className="font-medium">Mapeamento necessário</p>
          <p className="text-muted-foreground">
            Colunas detectadas: {headers.join(", ")}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Informe JSON em columnMap, ex.:
            {` {"date":"Data","description":"Histórico","amount":"Valor"}`}
          </p>
          <Input
            className="mt-2"
            name="columnMap"
            placeholder='{"date":"Data","description":"Histórico","amount":"Valor"}'
          />
        </div>
      ) : (
        <input type="hidden" name="columnMap" value="" />
      )}

      <p className="text-xs text-muted-foreground">
        Limite 5 MB. Sem OCR/IA: PDF digitalizado não gera lançamentos
        inventados.
      </p>
      <Button type="submit" disabled={pending || accounts.length === 0}>
        {pending ? "Processando..." : "Enviar e gerar prévia"}
      </Button>
    </form>
  );
}
