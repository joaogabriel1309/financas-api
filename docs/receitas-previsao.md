# Receitas e previsão mensal

Todas as rotas exigem autenticação e só acessam os dados do usuário atual.

## Cadastro e edição

```http
POST /receitas
Content-Type: application/json

{"nome":"Salário","valor":5000,"mes":"2026-10","recorrencia":true}
```

Nome (2 a 100 caracteres, sem espaços nas pontas), valor numérico não negativo com até duas casas decimais (máximo `9999999999999.99`), mês `AAAA-MM` (1900 a 9999) e recorrência booleana são obrigatórios. Valores negativos, `null`, texto numérico, meses inválidos e campos desconhecidos retornam 400.

- Avulsa (`recorrencia: false`): aparece somente no mês informado.
- Recorrente: aparece a partir do mês inicial, sem data final. Uma consulta não cria cópias nem altera o banco.
- `GET /receitas?mes=2026-10`: lista as entradas dessa competência.
- `GET /receitas/{uuid}`: consulta a definição para edição.
- `PATCH /receitas/{uuid}`: edição completa com os mesmos campos do cadastro.
- `DELETE /receitas/{uuid}`: exclui a definição em todos os meses e retorna 204.

Edição e exclusão de receitas recorrentes afetam todos os meses, inclusive competências passadas. O frontend informa esse alcance e pede confirmação antes de excluir. Não há registro de recebimento nem alteração de pagamentos das contas. Receitas inexistentes ou de outro usuário retornam 404.

## Previsão

`GET /previsao?mes=2026-10` retorna:

```json
{
  "mes": "2026-10",
  "receitasPrevistas": "5000.00",
  "despesasPrevistas": "2000.00",
  "saldoPrevisto": "3000.00",
  "quantidadeReceitas": 1,
  "quantidadeContas": 2
}
```

Receitas previstas somam as entradas avulsas e recorrentes válidas no mês. Despesas previstas somam todas as contas dessa competência, pagas ou em aberto: recorrências a partir do início e apenas uma parcela de cada conta parcelada dentro do período. O saldo previsto é receitas menos despesas; não é saldo bancário, não acumula meses anteriores e pode ser negativo. Quando não há registros, os totais são zero.

As somas usam `Decimal` no banco e no cálculo da diferença, retornando strings com duas casas decimais. Uma transação `RepeatableRead` mantém uma fotografia consistente das duas consultas. Listagem e previsão compartilham os filtros mensais para evitar regras divergentes. Sem parâmetro `mes`, usa o mês atual em `America/Cuiaba`.

## Migration

`20261009120000_add_receitas` cria apenas a tabela de receitas, seu índice por usuário/mês e a relação com usuários. Não altera contas nem pagamentos existentes. Faça backup antes de aplicar:

```powershell
pnpm exec prisma migrate deploy
pnpm exec prisma generate
```
