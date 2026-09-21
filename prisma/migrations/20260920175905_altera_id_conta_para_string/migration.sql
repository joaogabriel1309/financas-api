/*
  Warnings:

  - The primary key for the `contas` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "contas" DROP CONSTRAINT "contas_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "contas_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "contas_id_seq";
