-- CreateTable
CREATE TABLE "receitas" (
    "id" TEXT NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "valor" DECIMAL(15,2) NOT NULL,
    "mes_referencia" VARCHAR(7) NOT NULL,
    "recorrencia" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "usuario_id" INTEGER NOT NULL,

    CONSTRAINT "receitas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "receitas_usuario_id_mes_referencia_idx" ON "receitas"("usuario_id", "mes_referencia");

-- AddForeignKey
ALTER TABLE "receitas" ADD CONSTRAINT "receitas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
