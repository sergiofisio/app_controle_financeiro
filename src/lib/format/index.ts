import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";

export const APP_TIMEZONE = "America/Sao_Paulo";
export const APP_LOCALE = "pt-BR";
export const APP_CURRENCY = "BRL";

const currencyFormatter = new Intl.NumberFormat(APP_LOCALE, {
  style: "currency",
  currency: APP_CURRENCY,
});

export function formatMoney(value: number | string): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return currencyFormatter.format(0);
  return currencyFormatter.format(n);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatInTimeZone(d, APP_TIMEZONE, "dd/MM/yyyy", { locale: ptBR });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatInTimeZone(d, APP_TIMEZONE, "dd/MM/yyyy HH:mm", { locale: ptBR });
}
