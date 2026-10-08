import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CriarContaDto } from './dto/criar-conta.dto';
import { competencia, indiceMes, somarMeses } from './competencia';
import { AlterarFormaPagamentoContaDto } from './dto/alterar-forma-pagamento-conta.dto';
import { AlterarValorContaDto } from './dto/alterar-valor-conta.dto';

const formaPagamentoSelect = {
  id: true,
  nome: true,
  cor: true,
  icone: true,
} as const;
type ContaComPagamentos = Prisma.ContaGetPayload<{
  include: {
    pagamentos: true;
    formaPagamento: { select: typeof formaPagamentoSelect };
  };
}>;

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
    try {
      const conta = await this.prisma.conta.create({
        data: {
          nome: dto.nome.trim(),
          icone: dto.icone ?? 'wallet',
          valor: dto.valor ?? 0,
          recorrencia,
          parcela,
          mesReferencia: mes,
          mesFim: recorrencia ? null : somarMeses(mes, parcela - 1),
          usuario: { connect: { id: usuarioId } },
          // O dono da forma é validado na mesma escrita que cria a conta.
          ...(dto.formaPagamentoId
            ? {
                formaPagamento: {
                  connect: { id: dto.formaPagamentoId, usuarioId },
                },
              }
            : {}),
        },
        include: {
          pagamentos: true,
          formaPagamento: { select: formaPagamentoSelect },
        },
      });
      return apresentar(conta, mes);
    } catch (error: unknown) {
      if (
        dto.formaPagamentoId &&
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Forma de pagamento não encontrada.');
      }
      throw error;
    }
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
      include: {
        pagamentos: { where: { mes } },
        formaPagamento: { select: formaPagamentoSelect },
      },
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

  async alterarFormaPagamento(
    usuarioId: number,
    id: string,
    dto: AlterarFormaPagamentoContaDto,
  ) {
    try {
      return await this.prisma.conta.update({
        where: { id, usuarioId },
        data: {
          formaPagamento:
            dto.formaPagamentoId === null
              ? { disconnect: true }
              : { connect: { id: dto.formaPagamentoId, usuarioId } },
        },
        select: {
          id: true,
          formaPagamentoId: true,
          formaPagamento: { select: formaPagamentoSelect },
        },
      });
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(
          'Conta ou forma de pagamento não encontrada.',
        );
      }
      throw error;
    }
  }

  async alterarValor(usuarioId: number, id: string, dto: AlterarValorContaDto) {
    try {
      return await this.prisma.conta.update({
        where: { id, usuarioId },
        data: { valor: dto.valor },
        select: { id: true, valor: true },
      });
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Conta não encontrada.');
      }
      throw error;
    }
  }
}
