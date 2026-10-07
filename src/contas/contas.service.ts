import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  Conta,
  ContaPagamento,
  Prisma,
} from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CriarContaDto } from './dto/criar-conta.dto';
import { competencia, indiceMes, somarMeses } from './competencia';

type ContaComPagamentos = Conta & { pagamentos: ContaPagamento[] };

function filtroMensal(usuarioId: number, mes: string): Prisma.ContaWhereInput {
  return {
    usuarioId,
    mesReferencia: { lte: mes },
    OR: [{ recorrencia: true }, { mesFim: { gte: mes } }],
  };
}

function apresentar({ pagamentos, ...conta }: ContaComPagamentos, mes: string) {
  const pagamento = pagamentos.find((p) => p.mes === mes);
  return {
    ...conta,
    mes,
    parcelaAtual: conta.recorrencia
      ? null
      : indiceMes(mes) - indiceMes(conta.mesReferencia) + 1,
    pago: !!pagamento,
    dataHoraPagamento: pagamento?.dataHoraPagamento ?? null,
  };
}

@Injectable()
export class ContasService {
  constructor(private readonly prisma: PrismaService) {}

  async criar(usuarioId: number, dto: CriarContaDto) {
    const mes = competencia(dto.mes);
    const parcela = dto.parcela ?? 1;
    const recorrencia = dto.recorrencia ?? false;
    if (!Number.isInteger(parcela) || parcela < 1 || parcela > 360) {
      throw new BadRequestException('Informe de 1 a 360 parcelas inteiras.');
    }
    if (recorrencia && parcela > 1) {
      throw new BadRequestException(
        'Escolha recorrência ou parcelamento, não os dois.',
      );
    }
    const conta = await this.prisma.conta.create({
      data: {
        nome: dto.nome.trim(),
        valor: dto.valor ?? 0,
        recorrencia,
        parcela,
        mesReferencia: mes,
        mesFim: recorrencia ? null : somarMeses(mes, parcela - 1),
        usuarioId,
      },
      include: { pagamentos: true },
    });
    return apresentar(conta, mes);
  }

  async pagar(
    usuarioId: number,
    id: string,
    referencia?: string,
  ): Promise<void> {
    const mes = competencia(referencia);
    try {
      // Escrita aninhada atômica: verifica dono/competência e registra só este mês.
      await this.prisma.conta.update({
        where: { ...filtroMensal(usuarioId, mes), id },
        data: { pagamentos: { create: { mes } } },
        select: { id: true },
      });
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === 'P2002')
          throw new ConflictException('Conta já paga neste mês.');
        if (error.code === 'P2025')
          throw new NotFoundException('Conta não encontrada neste mês.');
      }
      throw error;
    }
  }

  async listar(usuarioId: number, referencia?: string) {
    const mes = competencia(referencia);
    const contas = await this.prisma.conta.findMany({
      where: filtroMensal(usuarioId, mes),
      include: { pagamentos: { where: { mes } } },
      orderBy: { createdAt: 'desc' },
    });
    return contas.map((conta) => apresentar(conta, mes));
  }

  async excluir(usuarioId: number, id: string): Promise<void> {
    const resultado = await this.prisma.conta.deleteMany({
      where: { id, usuarioId },
    });

    if (resultado.count === 0) {
      throw new NotFoundException('Conta não encontrada');
    }
  }
}
