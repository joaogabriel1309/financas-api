import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { competencia } from '../contas/competencia';
import { SalvarReceitaDto } from './dto/salvar-receita.dto';
import { filtroMensalReceitas } from './filtro-mensal';

@Injectable()
export class ReceitasService {
  constructor(private readonly prisma: PrismaService) {}

  criar(usuarioId: number, dto: SalvarReceitaDto) {
    return this.prisma.receita.create({
      data: {
        nome: dto.nome.trim(),
        valor: dto.valor,
        mesReferencia: competencia(dto.mes),
        recorrencia: dto.recorrencia,
        usuario: { connect: { id: usuarioId } },
      },
    });
  }

  listar(usuarioId: number, referencia?: string) {
    const mes = competencia(referencia);
    return this.prisma.receita.findMany({
      where: filtroMensalReceitas(usuarioId, mes),
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });
  }

  async buscar(usuarioId: number, id: string) {
    const receita = await this.prisma.receita.findUnique({
      where: { id, usuarioId },
    });
    if (!receita) throw new NotFoundException('Receita não encontrada.');
    return receita;
  }

  async editar(usuarioId: number, id: string, dto: SalvarReceitaDto) {
    try {
      return await this.prisma.receita.update({
        where: { id, usuarioId },
        data: {
          nome: dto.nome.trim(),
          valor: dto.valor,
          mesReferencia: competencia(dto.mes),
          recorrencia: dto.recorrencia,
        },
      });
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Receita não encontrada.');
      }
      throw error;
    }
  }

  async excluir(usuarioId: number, id: string): Promise<void> {
    const resultado = await this.prisma.receita.deleteMany({
      where: { id, usuarioId },
    });
    if (!resultado.count)
      throw new NotFoundException('Receita não encontrada.');
  }
}
