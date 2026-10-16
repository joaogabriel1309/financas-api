-- CreateTable
CREATE TABLE "telegram_vinculos" (
    "usuario_id" INTEGER NOT NULL,
    "telegram_user_id" BIGINT NOT NULL,
    "chat_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_vinculos_pkey" PRIMARY KEY ("usuario_id")
);

-- CreateTable
CREATE TABLE "telegram_codigos" (
    "usuario_id" INTEGER NOT NULL,
    "hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "telegram_codigos_pkey" PRIMARY KEY ("usuario_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "telegram_codigos_hash_key" ON "telegram_codigos"("hash");

-- AddForeignKey
ALTER TABLE "telegram_vinculos" ADD CONSTRAINT "telegram_vinculos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telegram_codigos" ADD CONSTRAINT "telegram_codigos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
