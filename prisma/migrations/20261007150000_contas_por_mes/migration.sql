BEGIN;

ALTER TABLE "contas" ADD COLUMN "mes_referencia" VARCHAR(7),
ADD COLUMN "mes_fim" VARCHAR(7);

-- Os timestamps do Prisma estão em UTC. A competência usa o mês em Cuiabá.
UPDATE "contas"
SET "mes_referencia" = to_char("created_at" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Cuiaba', 'YYYY-MM');

UPDATE "contas"
SET "mes_fim" = CASE WHEN "recorrencia" THEN NULL
ELSE to_char(to_date("mes_referencia", 'YYYY-MM') + (GREATEST("parcela", 1) - 1) * INTERVAL '1 month', 'YYYY-MM') END;

ALTER TABLE "contas" ALTER COLUMN "mes_referencia" SET NOT NULL;
ALTER TABLE "contas" ADD CONSTRAINT "contas_mes_referencia_check"
CHECK ("mes_referencia" ~ '^(19[0-9]{2}|[2-9][0-9]{3})-(0[1-9]|1[0-2])$');
ALTER TABLE "contas" ADD CONSTRAINT "contas_mes_fim_check"
CHECK ("mes_fim" IS NULL OR ("mes_fim" ~ '^(19[0-9]{2}|[2-9][0-9]{3})-(0[1-9]|1[0-2])$' AND "mes_fim" >= "mes_referencia"));

CREATE TABLE "conta_pagamentos" (
  "conta_id" TEXT NOT NULL,
  "mes" VARCHAR(7) NOT NULL,
  "data_hora_pagamento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "conta_pagamentos_pkey" PRIMARY KEY ("conta_id", "mes"),
  CONSTRAINT "conta_pagamentos_mes_check" CHECK ("mes" ~ '^(19[0-9]{2}|[2-9][0-9]{3})-(0[1-9]|1[0-2])$'),
  CONSTRAINT "conta_pagamentos_conta_id_fkey" FOREIGN KEY ("conta_id") REFERENCES "contas"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Preserva os pagamentos legados no mês inicial. As colunas antigas não são removidas.
INSERT INTO "conta_pagamentos" ("conta_id", "mes", "data_hora_pagamento")
SELECT "id", "mes_referencia", COALESCE("data_hora_pagamento", "updated_at")
FROM "contas" WHERE "pago" = true;

CREATE INDEX "contas_usuario_id_mes_referencia_mes_fim_idx" ON "contas"("usuario_id", "mes_referencia", "mes_fim");

COMMIT;
