import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CriarContaDto } from './dto/criar-conta.dto';

@Injectable()
export class ContasService {
  constructor(private readonly prisma: PrismaService) { }

  criar(usuarioId: number, dto: CriarContaDto) {
    return this.prisma.conta.create({
      data: {
        nome: dto.nome.trim(),
        valor: dto.valor ?? 0,
        usuarioId,
      },
    });
  }

  async pagar(usuarioId: number, id: number) {
    const conta = await this.prisma.conta.findUnique({
      where: { id, usuarioId },
    });

    if (!conta) {
      throw new NotFoundException('Conta não encontrada');
    }

    if (conta.pago) {
      throw new Error('Conta já pagou');
    }

    await this.prisma.conta.update({
      where: { id, usuarioId },
      data: {
        pago: true,
        dataHoraPagamento: new Date(),
      },
    });
  }

  listar(usuarioId: number) {
    return this.prisma.conta.findMany({
      where: { usuarioId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async excluir(usuarioId: number, id: number): Promise<void> {
    const resultado = await this.prisma.conta.deleteMany({
      where: { id, usuarioId },
    });

    if (resultado.count === 0) {
      throw new NotFoundException('Conta não encontrada');
    }
  }
}
