import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { competencia } from '../contas/competencia';
import { filtroMensalContas } from '../contas/filtro-mensal';
import { filtroMensalReceitas } from '../receitas/filtro-mensal';

@Injectable()
export class PrevisaoService {
  constructor(private readonly prisma: PrismaService) {}

  async mensal(usuarioId: number, referencia?: string) {
    const mes = competencia(referencia);
    // As duas somas usam a mesma fotografia do banco e nunca outros usuários.
    const [receitas, despesas] = await this.prisma.$transaction(
      [
        this.prisma.receita.aggregate({
          where: filtroMensalReceitas(usuarioId, mes),
          _sum: { valor: true },
          _count: { id: true },
        }),
        this.prisma.conta.aggregate({
          where: filtroMensalContas(usuarioId, mes),
          _sum: { valor: true },
          _count: { id: true },
        }),
      ],
      { isolationLevel: 'RepeatableRead' },
    );
    const receitasPrevistas = receitas._sum.valor ?? new Prisma.Decimal(0);
    const despesasPrevistas = despesas._sum.valor ?? new Prisma.Decimal(0);
    return {
      mes,
      receitasPrevistas: receitasPrevistas.toFixed(2),
      despesasPrevistas: despesasPrevistas.toFixed(2),
      saldoPrevisto: receitasPrevistas.minus(despesasPrevistas).toFixed(2),
      quantidadeReceitas: receitas._count.id,
      quantidadeContas: despesas._count.id,
    };
  }
}
