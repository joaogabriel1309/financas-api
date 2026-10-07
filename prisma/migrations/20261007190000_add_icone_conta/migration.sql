-- Preserve o ícone de carteira nas contas já cadastradas.
ALTER TABLE "contas" ADD COLUMN "icone" VARCHAR(24) NOT NULL DEFAULT 'wallet';
