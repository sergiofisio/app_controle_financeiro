export const accountTypeLabels = {
  CHECKING: "Conta corrente",
  SAVINGS: "Poupança",
  PAYMENT: "Conta de pagamento",
  CASH: "Carteira / dinheiro",
  INVESTMENT: "Conta de investimento",
  OTHER: "Outras",
} as const;

export const txTypeLabels = {
  INCOME: "Receita",
  EXPENSE: "Despesa",
  TRANSFER: "Transferência",
  ADJUSTMENT: "Ajuste",
  CONTRIBUTION: "Aporte",
  WITHDRAWAL: "Resgate",
  YIELD: "Rendimento",
} as const;

export const txStatusLabels = {
  PENDING: "Pendente",
  CLEARED: "Confirmado",
  SCHEDULED: "Agendado",
  CANCELLED: "Cancelado",
} as const;

export const invoiceStatusLabels = {
  OPEN: "Aberta",
  CLOSED: "Fechada",
  PAID: "Paga",
  PARTIAL: "Parcial",
} as const;
