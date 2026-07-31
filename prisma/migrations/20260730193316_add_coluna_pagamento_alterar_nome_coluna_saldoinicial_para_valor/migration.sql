/*
  Warnings:

  - You are about to drop the column `saldo_inicial` on the `contas` table. All the data in the column will be lost.
  - Added the required column `data_hora_pagamento` to the `contas` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "contas" DROP COLUMN "saldo_inicial",
ADD COLUMN     "data_hora_pagamento" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "pago" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "valor" DECIMAL(15,2) NOT NULL DEFAULT 0;
