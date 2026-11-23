# Checklist de fases

## Fase 1 — Fundação

Estado: **Concluída**

- [x] Next.js + TypeScript + Tailwind + shadcn/ui
- [x] Prisma 7 + schema auth/household + migration versionada
- [x] `.env.example` e `prisma.config.ts` (DIRECT_URL)
- [x] Better Auth (cadastro, login, logout, reset, troca de senha, perfil)
- [x] Household + convite com token de uso único
- [x] Layout responsivo, tema claro/escuro, navegação, CTA novo lançamento
- [x] Dashboard com empty states reais
- [x] AGENTS.md + docs
- [x] Migrations aplicadas no Supabase

## Fase 2 — Controle financeiro

Estado: **Concluída**

- [x] Contas financeiras + saldo inicial + saldo calculado
- [x] Categorias padrão (receitas/despesas) por família
- [x] Receitas, despesas, exclusão lógica, duplicar, filtros
- [x] Transferências atômicas (sem receita/despesa fictícia)
- [x] Lançamento rápido (+ Novo lançamento)
- [x] Histórico básico com paginação
- [x] Cartões, compras, parcelas, faturas
- [x] Pagamento de fatura sem segunda despesa
- [x] Funções monetárias Decimal + testes Vitest
- [x] Migration `phase2_finance` no Supabase

## Fase 3 — Importação de extratos

Estado: **Concluída**

- [x] Schema ImportBatch/Row/Mapping + CategorizationRule + campos de conciliação
- [x] Parsers CSV/OFX/PDF textual + normalização + testes Vitest
- [x] Antiduplicação (FITID/fingerprint), regras de categoria e confirmação transacional
- [x] UI `/importar`: upload, mapeamento CSV, prévia editável, histórico e desfazer
- [x] Conciliação básica (saldo informado vs calculado)
- [x] Migration `phase3_imports`

## Fase 4 — Dashboard e relatórios

Estado: **Pendente**

## Fase 5 — Orçamento e metas

Estado: **Pendente**

## Fase 6 — Investimentos

Estado: **Pendente**

## Fase 7 — Comparador

Estado: **Pendente**

## Fase 8 — Finalização

Estado: **Pendente**

## Bloqueios

- Nenhum bloqueio ativo na Fase 2.
