import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import type { App } from 'supertest/types';
import { ContasController } from './contas.controller';
import { ContasService } from './contas.service';

describe('ContasController: IDs UUID', () => {
  let app: INestApplication<App>;
  const uuid = '84933758-d41a-45cf-9116-62c2b7ccfb43';
  const service = {
    pagar: jest.fn().mockResolvedValue(undefined),
    excluir: jest.fn().mockResolvedValue(undefined),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ContasController],
      providers: [{ provide: ContasService, useValue: service }],
    }).compile();
    app = module.createNestApplication();
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
    expect(service.pagar).toHaveBeenCalledWith(7, uuid);
  });

  it('aceita UUID na exclusão', async () => {
    await request(app.getHttpServer()).delete(`/contas/${uuid}`).expect(204);
    expect(service.excluir).toHaveBeenCalledWith(7, uuid);
  });

  it('rejeita IDs numéricos e inválidos antes de chamar o serviço', async () => {
    await request(app.getHttpServer()).post('/contas/123').expect(400);
    await request(app.getHttpServer()).delete('/contas/invalido').expect(400);
    expect(service.pagar).not.toHaveBeenCalled();
    expect(service.excluir).not.toHaveBeenCalled();
  });
});
