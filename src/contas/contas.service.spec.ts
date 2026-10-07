import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ContasService } from './contas.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

describe('ContasService', () => {
  const prisma = {
    conta: {
      create: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
  let service: ContasService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const modulo = await Test.createTestingModule({
      providers: [ContasService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = modulo.get(ContasService);
  });

  it('cria uma conta vinculada ao usuário', async () => {
    prisma.conta.create.mockResolvedValue({ id: 1 });

    await service.criar(7, { nome: ' Conta principal ', valor: 100 });

    expect(prisma.conta.create).toHaveBeenCalledWith({
      data: {
        nome: 'Conta principal',
        valor: 100,
        recorrencia: false,
        usuarioId: 7,
      },
    });
  });

  it('salva a recorrência quando marcada sem criar outras contas', async () => {
    await service.criar(7, { nome: 'Internet', valor: 100, recorrencia: true });

    expect(prisma.conta.create).toHaveBeenCalledTimes(1);
    expect(prisma.conta.create).toHaveBeenCalledWith({
      data: { nome: 'Internet', valor: 100, recorrencia: true, usuarioId: 7 },
    });
  });

  it('lista apenas as contas do usuário', async () => {
    prisma.conta.findMany.mockResolvedValue([]);

    await service.listar(7);

    expect(prisma.conta.findMany).toHaveBeenCalledWith({
      where: { usuarioId: 7 },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('exclui apenas uma conta pertencente ao usuário', async () => {
    prisma.conta.deleteMany.mockResolvedValue({ count: 1 });

    await expect(service.excluir(7, 'conta-id')).resolves.toBeUndefined();
    expect(prisma.conta.deleteMany).toHaveBeenCalledWith({
      where: { id: 'conta-id', usuarioId: 7 },
    });
  });

  it('retorna 404 ao excluir conta inexistente ou de outro usuário', async () => {
    prisma.conta.deleteMany.mockResolvedValue({ count: 0 });

    await expect(service.excluir(7, 'conta-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
