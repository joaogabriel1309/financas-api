import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
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
      update: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
  let service: ContasService;

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.conta.create.mockImplementation(({ data }) =>
      Promise.resolve({
        id: 'conta-id',
        ...data,
        pago: false,
        dataHoraPagamento: null,
        pagamentos: [],
      }),
    );
    prisma.conta.findMany.mockResolvedValue([]);
    prisma.conta.update.mockResolvedValue({ id: 'conta-id' });
    const modulo = await Test.createTestingModule({
      providers: [ContasService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = modulo.get(ContasService);
  });

  it('cria uma conta vinculada ao usuário', async () => {
    const conta = await service.criar(7, {
      nome: ' Conta principal ',
      valor: 100,
      mes: '2026-10',
    });

    expect(prisma.conta.create).toHaveBeenCalledWith({
      data: {
        nome: 'Conta principal',
        valor: 100,
        recorrencia: false,
        parcela: 1,
        mesReferencia: '2026-10',
        mesFim: '2026-10',
        usuarioId: 7,
      },
      include: { pagamentos: true },
    });
    expect(conta).toMatchObject({
      mes: '2026-10',
      parcelaAtual: 1,
      pago: false,
    });
  });

  it('salva a recorrência quando marcada sem criar outras contas', async () => {
    await service.criar(7, {
      nome: 'Internet',
      valor: 100,
      recorrencia: true,
      mes: '2026-10',
    });

    expect(prisma.conta.create).toHaveBeenCalledTimes(1);
    expect(prisma.conta.create).toHaveBeenCalledWith({
      data: {
        nome: 'Internet',
        valor: 100,
        recorrencia: true,
        parcela: 1,
        mesReferencia: '2026-10',
        mesFim: null,
        usuarioId: 7,
      },
      include: { pagamentos: true },
    });
  });

  it('lista apenas as contas do usuário', async () => {
    prisma.conta.findMany.mockResolvedValue([]);

    await service.listar(7, '2026-10');

    expect(prisma.conta.findMany).toHaveBeenCalledWith({
      where: {
        usuarioId: 7,
        mesReferencia: { lte: '2026-10' },
        OR: [{ recorrencia: true }, { mesFim: { gte: '2026-10' } }],
      },
      include: { pagamentos: { where: { mes: '2026-10' } } },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('calcula o último mês das parcelas inclusive na virada do ano', async () => {
    await service.criar(7, {
      nome: 'Compra',
      valor: 50,
      mes: '2026-12',
      parcela: 3,
    });
    expect(prisma.conta.create).toHaveBeenCalledWith({
      data: {
        nome: 'Compra',
        usuarioId: 7,
        recorrencia: false,
        mesReferencia: '2026-12',
        mesFim: '2027-02',
        parcela: 3,
        valor: 50,
      },
      include: { pagamentos: true },
    });
  });

  it.each([0, -1, 1.5, 361])(
    'rejeita quantidade inválida de parcelas: %s',
    async (parcela) => {
      await expect(
        service.criar(7, { nome: 'Compra', parcela }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.conta.create).not.toHaveBeenCalled();
    },
  );

  it('rejeita recorrência e parcelamento simultâneos', async () => {
    await expect(
      service.criar(7, { nome: 'Compra', parcela: 3, recorrencia: true }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.conta.create).not.toHaveBeenCalled();
  });

  it('apresenta a parcela e o pagamento apenas do mês solicitado', async () => {
    prisma.conta.findMany.mockResolvedValue([
      {
        id: 'conta-id',
        nome: 'Compra',
        mesReferencia: '2026-12',
        mesFim: '2027-02',
        parcela: 3,
        recorrencia: false,
        pago: true,
        dataHoraPagamento: new Date(),
        pagamentos: [],
      },
    ]);
    const [conta] = await service.listar(7, '2027-01');
    expect(conta).toMatchObject({
      mes: '2027-01',
      parcelaAtual: 2,
      pago: false,
      dataHoraPagamento: null,
    });
    expect(conta).not.toHaveProperty('pagamentos');
  });

  it('registra pagamento com usuário e intervalo mensal na mesma escrita', async () => {
    await service.pagar(7, 'conta-id', '2026-11');
    expect(prisma.conta.update).toHaveBeenCalledWith({
      where: {
        id: 'conta-id',
        usuarioId: 7,
        mesReferencia: { lte: '2026-11' },
        OR: [{ recorrencia: true }, { mesFim: { gte: '2026-11' } }],
      },
      data: { pagamentos: { create: { mes: '2026-11' } } },
      select: { id: true },
    });
  });

  it('retorna 409 para pagamento duplicado no mesmo mês', async () => {
    prisma.conta.update.mockRejectedValueOnce({ code: 'P2002' });
    await expect(
      service.pagar(7, 'conta-id', '2026-11'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('retorna 404 para conta alheia ou fora do intervalo de meses', async () => {
    prisma.conta.update.mockRejectedValueOnce({ code: 'P2025' });
    await expect(
      service.pagar(7, 'conta-id', '2026-11'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('não consulta nem altera o banco com mês inválido', async () => {
    await expect(service.listar(7, '2026-13')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.pagar(7, 'conta-id', '')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.conta.findMany).not.toHaveBeenCalled();
    expect(prisma.conta.update).not.toHaveBeenCalled();
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
