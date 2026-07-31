import { PrismaPg } from "@prisma/adapter-pg"
import { hash } from "bcryptjs"
import { error } from "console"
import "dotenv/config"
import { PrismaClient } from "generated/prisma/client"

function obterVariavel(nome: string): string {
  const valor = process.env[nome]
  if (!valor) {
    throw new Error(`Variável de ambiente ${nome} não encontrada`)
  }
  return valor
}

const databaseUrl = obterVariavel("DATABASE_URL");

const adapter = new PrismaPg({ connectionString: databaseUrl });

const prisma = new PrismaClient({ adapter });

async function main() {
  const nome = obterVariavel("SEED_USER_NAME").trim();
  const login = obterVariavel("SEED_USER_LOGIN").trim().toLowerCase();
  const senha = obterVariavel("SEED_USER_PASSWORD").trim();

  const senhaHash = await hash(senha, 12);

  const usuario = await prisma.usuario.upsert({
    where: {
      login,
    },
    update: {
      nome,
      senha: senhaHash,
    },
    create: {
      nome,
      login,
      senha: senhaHash,
    },
    select: {
      id: true,
      nome: true,
      login: true,
    },
  });

  console.log("Usuário criado:", usuario);
}

main()
  .catch((error: unknown) => {
    console.error("Erro ao criar usuário:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  })