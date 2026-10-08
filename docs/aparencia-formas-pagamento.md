# Cor e ícone da forma de pagamento

`POST /formas-pagamento` e `PATCH /formas-pagamento/{id}` aceitam `nome`, `cor` e `icone`. O nome continua obrigatório. A cor deve ter o formato hexadecimal `#RRGGBB`; o ícone deve ser um dos valores: `card`, `wallet`, `banknote`, `bank`, `pix`, `receipt`, `phone` ou `loan`.

```json
{ "nome": "Pix", "cor": "#16a085", "icone": "pix" }
```

Na criação, omitir cor ou ícone usa `#0874df` e `card`. Na edição, omitir esses campos mantém os valores atuais, preservando clientes que enviam somente o nome. As operações continuam restritas ao usuário autenticado.

As respostas das formas de pagamento e a relação `formaPagamento` nas contas incluem `cor` e `icone`. Isso também vale para a resposta da troca de forma na listagem. Alterar a aparência não modifica valores, pagamentos ou vínculos das contas.

A migration `20261008010000_add_aparencia_forma_pagamento` adiciona os campos com valores padrão nas formas existentes. Faça backup antes de aplicar e gere novamente o cliente Prisma:

```powershell
pnpm exec prisma migrate deploy
pnpm exec prisma generate
```
