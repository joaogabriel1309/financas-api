-- Mantém as formas existentes e os vínculos das contas, usando cartão azul como padrão.
ALTER TABLE "formas_pagamento"
ADD COLUMN "cor" VARCHAR(7) NOT NULL DEFAULT '#0874df',
ADD COLUMN "icone" VARCHAR(24) NOT NULL DEFAULT 'card';
