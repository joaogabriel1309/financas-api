import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { competencia, indiceMes, mesAtual } from '../contas/competencia';
import { filtroMensalContas } from '../contas/filtro-mensal';
import { filtroMensalReceitas } from '../receitas/filtro-mensal';

@Injectable()
export class PrevisaoService {
  constructor(private readonly prisma: PrismaService) {}

  async mensal(usuarioId: number, referencia?: string) {
    const mesAtualDividas = mesAtual();
    const mes = competencia(referencia ?? mesAtualDividas);
    // Previsão e compromissos usam a mesma fotografia, sempre do usuário atual.
    const [receitas, despesas, recorrentes, contasComPagamentos] =
      await this.prisma.$transaction(
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
          this.prisma.conta.aggregate({
            where: { ...filtroMensalContas(usuarioId, mes), recorrencia: true },
            _sum: { valor: true },
            _count: { id: true },
          }),
          this.prisma.conta.findMany({
            where: {
              usuarioId,
              OR: [
                { recorrencia: false },
                { recorrencia: true, mesReferencia: { lte: mesAtualDividas } },
              ],
            },
            select: {
              valor: true,
              recorrencia: true,
              parcela: true,
              mesReferencia: true,
              mesFim: true,
              pagamentos: { select: { mes: true } },
            },
          }),
        ],
        { isolationLevel: 'RepeatableRead' },
      );
    const receitasPrevistas = receitas._sum.valor ?? new Prisma.Decimal(0);
    const despesasPrevistas = despesas._sum.valor ?? new Prisma.Decimal(0);
    const custoFixoMensal = recorrentes._sum.valor ?? new Prisma.Decimal(0);
    let dividasEmAberto = new Prisma.Decimal(0);
    let quantidadeContasComDivida = 0;

    for (const conta of contasComPagamentos) {
      const primeiroMes = indiceMes(conta.mesReferencia);
      // Parcelas têm fim; recorrências só geram dívida até o mês atual real.
      const ultimoMes = conta.recorrencia
        ? indiceMes(mesAtualDividas)
        : conta.mesFim
          ? indiceMes(conta.mesFim)
          : primeiroMes + conta.parcela - 1;
      const quantidadeMeses = Math.max(0, ultimoMes - primeiroMes + 1);
      const quantidadePagos = conta.pagamentos.filter(({ mes: mesPago }) => {
        const indice = indiceMes(mesPago);
        return indice >= primeiroMes && indice <= ultimoMes;
      }).length;
      const pendencias = Math.max(0, quantidadeMeses - quantidadePagos);

      if (pendencias > 0) {
        dividasEmAberto = dividasEmAberto.plus(conta.valor.mul(pendencias));
        quantidadeContasComDivida += 1;
      }
    }

    return {
      mes,
      receitasPrevistas: receitasPrevistas.toFixed(2),
      despesasPrevistas: despesasPrevistas.toFixed(2),
      saldoPrevisto: receitasPrevistas.minus(despesasPrevistas).toFixed(2),
      quantidadeReceitas: receitas._count.id,
      quantidadeContas: despesas._count.id,
      dividasEmAberto: dividasEmAberto.toFixed(2),
      quantidadeContasComDivida,
      mesAtualDividas,
      custoFixoMensal: custoFixoMensal.toFixed(2),
      quantidadeContasRecorrentes: recorrentes._count.id,
    };
  }
}
