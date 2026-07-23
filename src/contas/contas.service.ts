import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CriarContaDto } from './dto/criar-conta.dto';

@Injectable()
export class ContasService {
  constructor(private readonly prisma: PrismaService) {}

  criar(usuarioId: number, dto: CriarContaDto) {
    return this.prisma.conta.create({
      data: {
        nome: dto.nome.trim(),
        saldoInicial: dto.saldoInicial ?? 0,
        usuarioId,
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
