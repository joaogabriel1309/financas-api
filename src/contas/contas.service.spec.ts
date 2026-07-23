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

    await service.criar(7, { nome: ' Conta principal ', saldoInicial: 100 });

    expect(prisma.conta.create).toHaveBeenCalledWith({
      data: { nome: 'Conta principal', saldoInicial: 100, usuarioId: 7 },
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

    await expect(service.excluir(7, 2)).resolves.toBeUndefined();
    expect(prisma.conta.deleteMany).toHaveBeenCalledWith({
      where: { id: 2, usuarioId: 7 },
    });
  });

  it('retorna 404 ao excluir conta inexistente ou de outro usuário', async () => {
    prisma.conta.deleteMany.mockResolvedValue({ count: 0 });

    await expect(service.excluir(7, 2)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
