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
import { EditarContaDto } from './dto/editar-conta.dto';
import { calculaVencimento, dataHoje } from './vencimento';

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

function apresentar(
  { pagamentos, ...conta }: ContaComPagamentos,
  mes: string,
  hoje = dataHoje(),
) {
  const pagamento = pagamentos.find((p) => p.mes === mes);
  const pago = !!pagamento;
  return {
    ...conta,
    mes,
    parcelaAtual: conta.recorrencia
      ? null
      : indiceMes(mes) - indiceMes(conta.mesReferencia) + 1,
    pago,
    dataHoraPagamento: pagamento?.dataHoraPagamento ?? null,
    ...calculaVencimento(mes, conta.diaVencimento, pago, hoje),
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
          diaVencimento: dto.diaVencimento ?? null,
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
    const hoje = dataHoje();

    return contas.map((conta) => apresentar(conta, mes, hoje));
  }

  async buscar(usuarioId: number, id: string) {
    const conta = await this.prisma.conta.findUnique({
      where: { id, usuarioId },
      include: {
        pagamentos: true,
        formaPagamento: { select: formaPagamentoSelect },
      },
    });
    if (!conta) throw new NotFoundException('Conta não encontrada.');
    // A edição usa a definição original, não o mês/parcela exibido na listagem.
    return apresentar(conta, conta.mesReferencia);
  }

  async editar(usuarioId: number, id: string, dto: EditarContaDto) {
    const mes = competencia(dto.mes);
    if (dto.recorrencia && dto.parcela > 1) {
      throw new BadRequestException(
        'Escolha recorrência ou parcelamento, não os dois.',
      );
    }
    const mesFim = dto.recorrencia ? null : somarMeses(mes, dto.parcela - 1);
    try {
      const conta = await this.prisma.$transaction(
        async (tx) => {
          const atual = await tx.conta.findUnique({
            where: { id, usuarioId },
            select: { id: true, pagamentos: { select: { mes: true } } },
          });
          if (!atual) throw new NotFoundException('Conta não encontrada.');
          if (
            atual.pagamentos.some(
              (pagamento) =>
                pagamento.mes < mes ||
                (mesFim !== null && pagamento.mes > mesFim),
            )
          ) {
            throw new BadRequestException(
              'O período informado deixaria meses já pagos de fora. Ajuste o mês inicial, a recorrência ou as parcelas para manter esses meses.',
            );
          }
          return tx.conta.update({
            where: { id, usuarioId },
            data: {
              nome: dto.nome.trim(),
              icone: dto.icone,
              valor: dto.valor,
              mesReferencia: mes,
              mesFim,
              recorrencia: dto.recorrencia,
              parcela: dto.parcela,
              ...(dto.diaVencimento !== undefined
                ? { diaVencimento: dto.diaVencimento }
                : {}),
              ...(dto.formaPagamentoId !== undefined
                ? {
                    formaPagamento:
                      dto.formaPagamentoId === null
                        ? { disconnect: true }
                        : { connect: { id: dto.formaPagamentoId, usuarioId } },
                  }
                : {}),
            },
            include: {
              pagamentos: true,
              formaPagamento: { select: formaPagamentoSelect },
            },
          });
        },
        // Evita perder a validação do histórico se houver um pagamento simultâneo.
        { isolationLevel: 'Serializable' },
      );
      return apresentar(conta, mes);
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === 'P2025') {
          throw new NotFoundException(
            'Conta ou forma de pagamento não encontrada.',
          );
        }
        if (error.code === 'P2034') {
          throw new ConflictException(
            'A conta foi alterada durante a edição. Tente salvar novamente.',
          );
        }
      }
      throw error;
    }
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
