/*
  Warnings:

  - A unique constraint covering the columns `[telegram_user_id]` on the table `telegram_vinculos` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[chat_id]` on the table `telegram_vinculos` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "telegram_updates" (
    "bot_id" BIGINT NOT NULL,
    "update_id" INTEGER NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "resposta" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_updates_pkey" PRIMARY KEY ("bot_id","update_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "telegram_vinculos_telegram_user_id_key" ON "telegram_vinculos"("telegram_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "telegram_vinculos_chat_id_key" ON "telegram_vinculos"("chat_id");
