<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Finanças em Família — regras do agente

- Antes de qualquer fase: ler `docs/TASKS.md`, `docs/PRODUCT.md` e `docs/FINANCIAL_RULES.md`.
- Comando `Continue`: implementar a próxima fase incompleta; não recriar o projeto.
- Banco: apenas PostgreSQL do Supabase. Sem SQLite, Docker DB ou Postgres local.
- Prisma 7 estável (`prisma` / `@prisma/client` 7.x). Não usar Prisma 8.
- `DATABASE_URL` = pooler transacional; `DIRECT_URL` = session/direct para migrations (`prisma.config.ts`).
- Auth: Better Auth (não Supabase Auth). Autorização por `householdId` no servidor.
- Valores monetários: Decimal/Numeric — nunca float descontrolado.
- Sem mocks na UI de produção; empty states reais quando não houver dados.
- Sem SMTP pago na v1: convites e reset de senha via link copiável.
- Respostas ao fim de fase: no máximo 8 linhas (fase, feito, verificação, bloqueios, próxima).
- Não colar código completo no chat sem pedido explícito.
