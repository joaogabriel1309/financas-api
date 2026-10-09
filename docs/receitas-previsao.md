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
  "quantidadeContas": 2,
  "dividasEmAberto": "6400.00",
  "quantidadeContasComDivida": 3,
  "mesAtualDividas": "2026-10",
  "custoFixoMensal": "800.00",
  "quantidadeContasRecorrentes": 1
}
```

Receitas previstas somam as entradas avulsas e recorrentes válidas no mês. Despesas previstas somam todas as contas dessa competência, pagas ou em aberto: recorrências a partir do início e apenas uma parcela de cada conta parcelada dentro do período. O saldo previsto é receitas menos despesas; não é saldo bancário, não acumula meses anteriores e pode ser negativo. Quando não há registros, os totais são zero.

As somas usam `Decimal` no banco e no cálculo da diferença, retornando strings com duas casas decimais. Uma transação `RepeatableRead` mantém uma fotografia consistente de todas as consultas. Listagem e previsão compartilham os filtros mensais para evitar regras divergentes. Sem parâmetro `mes`, usa o mês atual em `America/Cuiaba`.

## Compromissos financeiros

Os indicadores adicionais no mesmo endpoint não alteram a previsão mensal:

- `dividasEmAberto`: soma de todas as parcelas e contas avulsas não pagas, de qualquer mês, passado ou futuro. Para recorrências, soma apenas os meses não pagos entre o início da conta e o mês atual real (`mesAtualDividas`, no fuso de Cuiabá). Não projeta recorrências futuras sem limite e não depende do filtro de mês da tela.
- `quantidadeContasComDivida`: quantidade de contas distintas que possuem pelo menos um mês ou parcela pendente; não é a quantidade de parcelas.
- `custoFixoMensal`: soma de uma mensalidade de cada conta recorrente ativa no mês selecionado, mesmo que já paga. Não inclui contas avulsas ou parceladas.
- `quantidadeContasRecorrentes`: quantidade de recorrências ativas no mês selecionado.

Cada pagamento registrado reduz apenas uma ocorrência da própria conta. Pagamentos fora do período considerado não reduzem o total, inclusive antecipações de recorrências de meses futuros. O cálculo usa o valor atual da conta, sem juros ou histórico de valores. Não subtrai receitas, não trata todas as dívidas como atrasadas e não cria registros no banco. Sem compromissos, retorna valores e contagens zero. Não requer nova migration.

## Migration

`20261009120000_add_receitas` cria apenas a tabela de receitas, seu índice por usuário/mês e a relação com usuários. Não altera contas nem pagamentos existentes. Faça backup antes de aplicar:

```powershell
pnpm exec prisma migrate deploy
pnpm exec prisma generate
```
