import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import type { App } from 'supertest/types';
import { ContasController } from './contas.controller';
import { ContasService } from './contas.service';

describe('ContasController: IDs UUID', () => {
  let app: INestApplication<App>;
  const uuid = '84933758-d41a-45cf-9116-62c2b7ccfb43';
  const service = {
    criar: jest.fn().mockResolvedValue({ id: uuid }),
    listar: jest.fn().mockResolvedValue([]),
    pagar: jest.fn().mockResolvedValue(undefined),
    excluir: jest.fn().mockResolvedValue(undefined),
    alterarValor: jest.fn().mockResolvedValue({ id: uuid, valor: '129.90' }),
    alterarFormaPagamento: jest.fn().mockResolvedValue({
      id: uuid,
      formaPagamentoId: null,
      formaPagamento: null,
    }),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ContasController],
      providers: [{ provide: ContasService, useValue: service }],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.use((req: Request, _res: Response, next: NextFunction) => {
      Object.assign(req, { user: { id: 7 } });
      next();
    });
    await app.init();
  });

  beforeEach(() => jest.clearAllMocks());
  afterAll(async () => {
    await app.close();
  });

  it('aceita UUID no pagamento sem converter para número', async () => {
    await request(app.getHttpServer()).post(`/contas/${uuid}`).expect(204);
    expect(service.pagar).toHaveBeenCalledWith(7, uuid, undefined);
  });

  it.each([0, 129.9, 9_999_999_999_999.99])(
    'atualiza somente o valor com número válido: %s',
    async (valor) => {
      await request(app.getHttpServer())
        .patch(`/contas/${uuid}/valor`)
        .send({ valor })
        .expect(200);
      expect(service.alterarValor).toHaveBeenCalledWith(7, uuid, { valor });
    },
  );

  it.each([
    {},
    { valor: null },
    { valor: '' },
    { valor: '129.90' },
    { valor: '129,90' },
    { valor: true },
    { valor: [100] },
    { valor: -1 },
    { valor: 10.001 },
    { valor: 10_000_000_000_000 },
    { valor: 100, pago: true },
    { valor: 100, usuarioId: 8 },
  ])(
    'rejeita atualização de valor inválida ou com campos extras: %j',
    async (body) => {
      await request(app.getHttpServer())
        .patch(`/contas/${uuid}/valor`)
        .send(body)
        .expect(400);
      expect(service.alterarValor).not.toHaveBeenCalled();
    },
  );

  it('rejeita ID inválido na edição de valor', async () => {
    await request(app.getHttpServer())
      .patch('/contas/123/valor')
      .send({ valor: 100 })
      .expect(400);
    expect(service.alterarValor).not.toHaveBeenCalled();
  });

  it('aceita UUID na exclusão', async () => {
    await request(app.getHttpServer()).delete(`/contas/${uuid}`).expect(204);
    expect(service.excluir).toHaveBeenCalledWith(7, uuid);
  });

  it('encaminha o mês da listagem e do pagamento', async () => {
    await request(app.getHttpServer()).get('/contas?mes=2027-01').expect(200);
    expect(service.listar).toHaveBeenCalledWith(7, '2027-01');
    await request(app.getHttpServer())
      .post(`/contas/${uuid}?mes=2027-01`)
      .expect(204);
    expect(service.pagar).toHaveBeenCalledWith(7, uuid, '2027-01');
  });

  it('rejeita mês inválido, repetido e parâmetros desconhecidos', async () => {
    await request(app.getHttpServer()).get('/contas?mes=2026-13').expect(400);
    await request(app.getHttpServer())
      .get('/contas?mes=2026-10&mes=2026-11')
      .expect(400);
    await request(app.getHttpServer()).get('/contas?usuarioId=8').expect(400);
    expect(service.listar).not.toHaveBeenCalled();
  });

  it('valida mês, recorrência e parcelas inteiras no cadastro', async () => {
    await request(app.getHttpServer())
      .post('/contas')
      .send({ nome: 'Compra', valor: 30, mes: '2026-12', parcela: 3 })
      .expect(201);
    expect(service.criar).toHaveBeenCalledWith(7, {
      nome: 'Compra',
      valor: 30,
      mes: '2026-12',
      parcela: 3,
    });
    await request(app.getHttpServer())
      .post('/contas')
      .send({ nome: 'Compra', parcela: 2.5 })
      .expect(400);
    await request(app.getHttpServer())
      .post('/contas')
      .send({ nome: 'Compra', mes: '2026-00' })
      .expect(400);
  });

  it('rejeita IDs numéricos e inválidos antes de chamar o serviço', async () => {
    await request(app.getHttpServer()).post('/contas/123').expect(400);
    await request(app.getHttpServer()).delete('/contas/invalido').expect(400);
    expect(service.pagar).not.toHaveBeenCalled();
    expect(service.excluir).not.toHaveBeenCalled();
  });

  it('aceita forma de pagamento com UUID e encaminha ao serviço', async () => {
    await request(app.getHttpServer())
      .post('/contas')
      .send({ nome: 'Internet', formaPagamentoId: uuid })
      .expect(201);
    expect(service.criar).toHaveBeenCalledWith(7, {
      nome: 'Internet',
      formaPagamentoId: uuid,
    });
  });

  it.each(['', 'invalido', 123, true, [uuid]])(
    'rejeita formaPagamentoId inválido: %j',
    async (formaPagamentoId) => {
      await request(app.getHttpServer())
        .post('/contas')
        .send({ nome: 'Internet', formaPagamentoId })
        .expect(400);
      expect(service.criar).not.toHaveBeenCalled();
    },
  );

  it('aceita forma de pagamento não informada explicitamente', async () => {
    await request(app.getHttpServer())
      .post('/contas')
      .send({ nome: 'Internet', formaPagamentoId: null })
      .expect(201);
    expect(service.criar).toHaveBeenCalledWith(7, {
      nome: 'Internet',
      formaPagamentoId: null,
    });
  });

  it.each([uuid, null])(
    'atualiza o vínculo por UUID ou remove com null: %j',
    async (formaPagamentoId) => {
      await request(app.getHttpServer())
        .patch(`/contas/${uuid}`)
        .send({ formaPagamentoId })
        .expect(200);
      expect(service.alterarFormaPagamento).toHaveBeenCalledWith(7, uuid, {
        formaPagamentoId,
      });
    },
  );

  it.each([
    {},
    { formaPagamentoId: '' },
    { formaPagamentoId: 'invalido' },
    { formaPagamentoId: 123 },
    { formaPagamentoId: true },
    { formaPagamentoId: [uuid] },
    { formaPagamentoId: null, pago: true },
    { formaPagamentoId: null, usuarioId: 8 },
  ])(
    'rejeita atualização sem vínculo explícito, inválida ou com outros campos: %j',
    async (body) => {
      await request(app.getHttpServer())
        .patch(`/contas/${uuid}`)
        .send(body)
        .expect(400);
      expect(service.alterarFormaPagamento).not.toHaveBeenCalled();
    },
  );

  it('rejeita ID inválido ao atualizar forma da conta', async () => {
    await request(app.getHttpServer())
      .patch('/contas/123')
      .send({ formaPagamentoId: null })
      .expect(400);
    expect(service.alterarFormaPagamento).not.toHaveBeenCalled();
  });
});
