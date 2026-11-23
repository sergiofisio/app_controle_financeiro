# Finanças em Família

Aplicação de gestão financeira familiar (Next.js + Prisma 7 + Supabase PostgreSQL + Better Auth).

## Setup

1. Crie o projeto PostgreSQL no Supabase (manual).
2. Copie `.env.example` → `.env` e preencha:
   - `DATABASE_URL` — Transaction pooler (`:6543`, `?pgbouncer=true`)
   - `DIRECT_URL` — Session pooler (`:5432`) ou Direct (se houver IPv6/IPv4 add-on)
   - `BETTER_AUTH_SECRET` — `openssl rand -base64 32`
   - `BETTER_AUTH_URL` — `http://localhost:3000`
3. Instale e migre:

```bash
npm install
npx prisma generate
npm run db:migrate
npm run dev
```

Em produção use `npm run db:deploy`.

## Deploy (Vercel)

1. Importe o repositório GitHub na Vercel.
2. Framework preset: Next.js.
3. Configure as variáveis de ambiente:
   - `DATABASE_URL` — Transaction pooler Supabase (`:6543`, `?pgbouncer=true`)
   - `DIRECT_URL` — Session pooler (`:5432`)
   - `BETTER_AUTH_SECRET` — string forte
   - `BETTER_AUTH_URL` — URL pública do app (ex.: `https://seu-projeto.vercel.app`)
4. Build Command padrão (`next build`). O `postinstall` roda `prisma generate`.
5. Após o primeiro deploy (ou via CI), rode `prisma migrate deploy` com `DIRECT_URL` apontando ao Supabase.

## Notas

- Não use Supabase Auth; autenticação é Better Auth.
- Convites e recuperação de senha usam links copiáveis (sem SMTP pago na v1).
- Progresso: `docs/TASKS.md`.
- Nunca commite o arquivo `.env`.
