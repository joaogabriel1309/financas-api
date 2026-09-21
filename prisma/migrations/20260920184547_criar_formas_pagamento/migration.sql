-- AlterTable
ALTER TABLE "contas" ADD COLUMN     "formaPagamentoId" TEXT;

-- CreateTable
CREATE TABLE "formas_pagamento" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "usuario_id" INTEGER NOT NULL,

    CONSTRAINT "formas_pagamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "formas_pagamento_nome_usuario_id_key" ON "formas_pagamento"("nome", "usuario_id");

-- CreateIndex
CREATE INDEX "contas_formaPagamentoId_idx" ON "contas"("formaPagamentoId");

-- AddForeignKey
ALTER TABLE "contas" ADD CONSTRAINT "contas_formaPagamentoId_fkey" FOREIGN KEY ("formaPagamentoId") REFERENCES "formas_pagamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formas_pagamento" ADD CONSTRAINT "formas_pagamento_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
