# Finanças em Família — produto

Gestão financeira familiar compartilhada: contas, lançamentos, cartões, importação de extratos, orçamento, metas, investimentos e comparador.

## Stack

Next.js App Router, TypeScript strict, Tailwind, shadcn/ui, Prisma 7 + PostgreSQL Supabase, Better Auth, Zod, React Hook Form, Recharts (fases seguintes), Vitest (regras financeiras).

## Decisões

- Uma família (`Household`) com membros `ADMIN` | `MEMBER`.
- Visibilidade financeira completa entre membros na v1; papéis preparados para restrições futuras.
- Autorização sempre no servidor por associação ao household (RLS do Supabase não protege o Prisma privilegiado).
- Transferências internas não alteram receita/despesa/patrimônio.
- Pagamento de fatura não é segunda despesa.
- Aportes ≠ ganhos; resgates ≠ receita operacional.
- Importação CSV/OFX/PDF textual sem IA/OCR pagos.
- Indicadores econômicos públicos (BCB) com cache no Postgres.
- Locale: pt-BR, BRL, `America/Sao_Paulo`, datas `dd/MM/yyyy`.

## Ambientes

`.env.example` lista `DATABASE_URL`, `DIRECT_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`.
Produção: `prisma migrate deploy` após revisão. Sem migrations destrutivas automáticas.
