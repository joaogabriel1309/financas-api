import { JwtService } from '@nestjs/jwt';
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
  };
  const jwtService = { signAsync: jest.fn().mockResolvedValue('token-jwt') };
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
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
    expect(resultado.usuario).not.toHaveProperty('senha');
  });

  it('rejeita credenciais inválidas', async () => {
    prisma.usuario.findUnique.mockResolvedValue(null);

    await expect(
      service.login({ login: 'joao', senha: 'incorreta' }),
    ).rejects.toMatchObject({ status: 401 });
  });
});
