import { CreditCard } from "lucide-react";
import { CardForm } from "@/features/cards/card-form";
import { CardPurchaseForm } from "@/features/cards/card-purchase-form";
import { PayInvoiceForm } from "@/features/cards/pay-invoice-form";
import { EmptyState } from "@/components/empty-state";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatMoney } from "@/lib/format";
import { decimalToNumber } from "@/lib/money";
import { invoiceStatusLabels } from "@/lib/finance-labels";
import { listActiveAccounts } from "@/server/accounts/queries";
import { listCardsWithInvoices } from "@/server/cards/queries";
import {
  listCategories,
  listHouseholdMembersForSelect,
} from "@/server/transactions/queries";

export default async function CartoesPage() {
  const [cards, accounts, categories, members] = await Promise.all([
    listCardsWithInvoices(),
    listActiveAccounts(),
    listCategories("EXPENSE"),
    listHouseholdMembersForSelect(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Cartões de crédito
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Compras geram despesa; pagamento de fatura apenas liquida a obrigação.
        </p>
      </div>

      {cards.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="Nenhum cartão cadastrado"
          description="Cadastre um cartão para registrar compras e acompanhar faturas."
        />
      ) : (
        <div className="space-y-4">
          {cards.map((card) => (
            <Card key={card.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle>{card.name}</CardTitle>
                    <CardDescription>
                      {card.institution} · Fecha dia {card.closingDay} · Vence
                      dia {card.dueDay}
                      {card.holder ? ` · ${card.holder.name}` : ""}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">
                    Limite {formatMoney(decimalToNumber(card.creditLimit))}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {card.invoices.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Sem faturas ainda. Elas surgem ao registrar compras.
                  </p>
                ) : (
                  card.invoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="rounded-xl border p-3 space-y-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-medium">
                            Fatura {formatDate(invoice.referenceMonth)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Fecha {formatDate(invoice.closingDate)} · Vence{" "}
                            {formatDate(invoice.dueDate)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="tabular-nums font-semibold">
                            {formatMoney(decimalToNumber(invoice.total))}
                          </p>
                          <Badge variant="outline">
                            {invoiceStatusLabels[invoice.status]}
                          </Badge>
                        </div>
                      </div>
                      {invoice.status !== "PAID" ? (
                        <PayInvoiceForm
                          invoiceId={invoice.id}
                          accounts={accounts.map((a) => ({
                            id: a.id,
                            name: a.name,
                          }))}
                          suggestedAmount={invoice.total.toFixed(2).replace(".", ",")}
                        />
                      ) : null}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Novo cartão</CardTitle>
          </CardHeader>
          <CardContent>
            <CardForm members={members} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Registrar compra</CardTitle>
            <CardDescription>
              Suporta parcelamento com competência mensal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CardPurchaseForm
              cards={cards.map((c) => ({ id: c.id, name: c.name }))}
              categories={categories.map((c) => ({ id: c.id, name: c.name }))}
              members={members}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
