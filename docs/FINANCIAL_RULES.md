# Regras financeiras (resumo)

1. Monetário: `Decimal` / `Numeric` no banco e backend; arredondamento explícito BRL.
2. Datas: preservar movimento, competência e vencimento separadamente.
3. Transferência interna: não conta como receita nem despesa; patrimônio inalterado.
4. Cartão: compra = despesa + obrigação; pagamento da fatura = liquidação, não nova despesa.
5. Aporte ≠ gasto de consumo; resgate ≠ receita operacional; rendimento ≠ aporte.
6. Não duplicar ativos no patrimônio (metas vinculadas a contas/investimentos).
7. Importação: antiduplicação por ID bancário/fingerprint; lote transacional; desfazer com auditoria.
8. Não inventar dados para períodos sem cobertura; informar cobertura disponível.
9. Patrimônio histórico usa posições/preços da data — nunca projetar valor atual no passado.
10. Funções de cálculo centralizadas e cobertas por testes (a partir das fases financeiras).

## Fase 2 — detalhe operacional

- Valor monetário no banco é sempre positivo; sinal vem do tipo/`cashEffect`.
- Transferência: `TransferGroup` + 2 legs `TRANSFER` (OUT/IN); patrimônio conjunto inalterado.
- Compra no cartão: `EXPENSE` + vínculo à fatura; `accountId` nulo (não mexe saldo bancário).
- Pagamento de fatura: saída de caixa (`TRANSFER`/`SYSTEM`) ligada à fatura; **não** é despesa operacional.
- Exclusão de lançamento é lógica (`deletedAt` + `CANCELLED`).
- Categorias padrão são seedadas por família na criação / primeiro uso.
