import type { Prisma } from '../../generated/prisma/client';

export function filtroMensalReceitas(
  usuarioId: number,
  mes: string,
): Prisma.ReceitaWhereInput {
  return {
    usuarioId,
    mesReferencia: { lte: mes },
    OR: [{ recorrencia: true }, { mesReferencia: mes }],
  };
}
