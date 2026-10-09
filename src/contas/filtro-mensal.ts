import type { Prisma } from '../../generated/prisma/client';

export function filtroMensalContas(
  usuarioId: number,
  mes: string,
): Prisma.ContaWhereInput {
  return {
    usuarioId,
    mesReferencia: { lte: mes },
    OR: [{ recorrencia: true }, { mesFim: { gte: mes } }],
  };
}
