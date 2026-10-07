# Contas por mês

As competências usam `AAAA-MM`. Sem `mes`, a API usa o mês atual em `America/Cuiaba`.

- Conta única: somente no mês informado.
- Recorrência: todos os meses a partir do mês inicial, sem data final.
- Parcelas: uma por mês, até a quantidade informada (1 a 360). `valor` é o valor de cada parcela, não o total da compra.
- Recorrência e múltiplas parcelas não podem ser combinadas.
- Pagar uma conta marca apenas o mês escolhido. Pagar novamente o mesmo mês retorna 409.
- Excluir remove a conta inteira, suas parcelas e os pagamentos de todos os meses. O frontend pede confirmação explícita.

## API

```http
GET /contas?mes=2027-01
POST /contas
Content-Type: application/json

{"nome":"Compra","valor":75.50,"mes":"2026-12","parcela":3,"recorrencia":false}
```

Esta conta aparece em dezembro, janeiro e fevereiro. A resposta mensal inclui `mes`, `mesReferencia`, `mesFim`, `parcela`, `parcelaAtual`, `recorrencia`, `pago` e `dataHoraPagamento`.

### Forma de pagamento

O cadastro aceita `formaPagamentoId` opcional (UUID de uma forma cadastrada pelo usuário autenticado). Omitir o campo ou enviar `null` cria uma conta sem vínculo.

```json
{
  "nome": "Internet",
  "valor": 100,
  "mes": "2026-10",
  "recorrencia": true,
  "formaPagamentoId": "84933758-d41a-45cf-9116-62c2b7ccfb43"
}
```

A criação e a listagem retornam `formaPagamentoId` e `formaPagamento: { "id": "...", "nome": "Pix" }`, ou ambos `null` quando não houver vínculo. A mesma forma vale para todos os meses e parcelas. UUID inválido retorna 400; forma inexistente ou de outro usuário retorna 404 e não cria a conta. A validação de propriedade e o vínculo são feitos em uma única escrita aninhada.

Renomear a forma altera o nome exibido nas próximas consultas. Excluí-la mantém as contas e seus pagamentos, deixando o vínculo `null`, conforme a relação `ON DELETE SET NULL` já existente. Não é necessária uma nova migration para este vínculo.

Para trocar a forma de uma conta existente (incluindo contas já pagas):

```http
PATCH /contas/{uuid}
Content-Type: application/json

{"formaPagamentoId":"84933758-d41a-45cf-9116-62c2b7ccfb43"}
```

Enviar `{"formaPagamentoId":null}` remove o vínculo. O campo é obrigatório neste endpoint; omiti-lo ou enviar UUID inválido retorna 400. A resposta 200 contém somente `id`, `formaPagamentoId` e `formaPagamento`. Não é necessário informar `mes`: o vínculo pertence à definição da conta e muda em todos os meses/parcelas, sem alterar valores, status ou datas dos pagamentos. Contas e formas de outro usuário ou inexistentes retornam 404 sem modificar o vínculo anterior.

```http
POST /contas/{uuid}?mes=2027-01
DELETE /contas/{uuid}
```

Todas as operações continuam vinculadas ao usuário autenticado. Listar meses não cria registros; a conta contém o intervalo de competências e os pagamentos têm chave única `(contaId, mes)`.

## Atualizar o banco

Faça um backup antes de aplicar migrations:

```powershell
pnpm exec prisma migrate deploy
pnpm exec prisma generate
```

A migration `20261007150000_contas_por_mes` associa as contas existentes ao mês do cadastro em Cuiabá e preserva pagamentos antigos nesse mês inicial. As colunas legadas `pago` e `data_hora_pagamento` são mantidas para preservar dados, mas a API passa a usar `conta_pagamentos` como fonte do status mensal. Não há reset nem exclusão de contas na migration.

## Verificação isolada

```powershell
pnpm test -- --runInBand
pnpm exec tsx test/contas-mensais.integration.ts
```

O teste de integração exige PostgreSQL local e permissão para criar bancos. Ele cria e remove apenas um banco temporário com prefixo `financas_monthly_test_`; não insere dados no banco da aplicação.
