import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { hash } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

describe('AuthService', () => {
  const usuario = {
    id: 1,
    nome: 'João',
    login: 'joao',
    senha: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const prisma = {
    usuario: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    refreshToken: {
      findUnique: jest.fn(),
      create: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    $transaction: jest.fn().mockResolvedValue([]),
  };
  const jwtService = {
    signAsync: jest.fn().mockResolvedValue('token-jwt'),
    verifyAsync: jest.fn(),
  };
  const config = {
    get: jest.fn((_chave: string, padrao: number) => padrao),
    getOrThrow: jest.fn().mockReturnValue('refresh-secret'),
  };
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  it('autentica credenciais válidas sem retornar a senha', async () => {
    prisma.usuario.findUnique.mockResolvedValue({
      ...usuario,
      senha: await hash('senha-segura', 4),
    });

    const resultado = await service.login({
      login: 'JOAO',
      senha: 'senha-segura',
    });

    expect(prisma.usuario.findUnique).toHaveBeenCalledWith({
      where: { login: 'joao' },
    });
    expect(resultado.accessToken).toBe('token-jwt');
    expect(resultado.refreshToken).toBe('token-jwt');
    expect(resultado.usuario).not.toHaveProperty('senha');
    expect(prisma.refreshToken.create).toHaveBeenCalled();
  });

  it('rejeita credenciais inválidas', async () => {
    prisma.usuario.findUnique.mockResolvedValue(null);

    await expect(
      service.login({ login: 'joao', senha: 'incorreta' }),
    ).rejects.toMatchObject({ status: 401 });
  });

  it('rotaciona um refresh token válido', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: usuario.id,
      login: usuario.login,
      type: 'refresh',
      jti: 'refresh-id',
    });
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 1,
      usuarioId: usuario.id,
      expiresAt: new Date(Date.now() + 60_000),
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        login: usuario.login,
        createdAt: usuario.createdAt,
        updatedAt: usuario.updatedAt,
      },
    });

    const resultado = await service.renovar({
      refreshToken: 'token.antigo.jwt',
    });

    expect(resultado.accessToken).toBe('token-jwt');
    expect(resultado.refreshToken).toBe('token-jwt');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.refreshToken.delete).toHaveBeenCalled();
    expect(prisma.refreshToken.create).toHaveBeenCalled();
  });
});
