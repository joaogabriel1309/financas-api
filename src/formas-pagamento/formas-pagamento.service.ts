import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFormasPagamentoDto } from './dto/create-formas-pagamento.dto';

@Injectable()
export class FormasPagamentoService {
  constructor(private readonly prisma: PrismaService) {}

  criar(usuarioId: number, createFormasPagamentoDto: CreateFormasPagamentoDto) {
    return this.prisma.formaPagamento.create({
      data: {
        usuarioId: usuarioId,
        nome: createFormasPagamentoDto.nome,        
      },
    });
  }

  buscarTodos(usuarioId: number) {
    return this.prisma.formaPagamento.findMany({
      where: { usuarioId },
      orderBy: { nome: 'asc' },
    });
  }

  buscarPorId(usuarioId: number, id: string) {
    return this.prisma.formaPagamento.findUnique({
      where: { id, usuarioId },
    });
  }

  update(usuarioId: number, id: string, updateFormasPagamentoDto: CreateFormasPagamentoDto) {
    return this.prisma.formaPagamento.update({
      where: { id, usuarioId },
      data: {
        nome: updateFormasPagamentoDto.nome,
      },
    });
  }

  remove(usuarioId: number, id: string) {
    return this.prisma.formaPagamento.delete({
      where: { id, usuarioId },
    });
  }
}
