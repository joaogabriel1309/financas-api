import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { compare, hash } from 'bcryptjs';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload, RefreshTokenPayload } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegistrarDto } from './dto/registrar.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async registrar(dto: RegistrarDto) {
    const login = dto.login.trim().toLowerCase();
    const existente = await this.prisma.usuario.findUnique({
      where: { login },
    });
    if (existente) throw new ConflictException('Login já está em uso');

    const usuario = await this.prisma.usuario.create({
      data: {
        nome: dto.nome.trim(),
        login,
        senha: await hash(dto.senha, 12),
      },
      omit: { senha: true },
    });

    return this.criarSessao(usuario);
  }

  async login(dto: LoginDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { login: dto.login.trim().toLowerCase() },
    });

    if (!usuario || !(await compare(dto.senha, usuario.senha))) {
      throw new UnauthorizedException('Login ou senha inválidos');
    }

    const usuarioSeguro = {
      id: usuario.id,
      nome: usuario.nome,
      login: usuario.login,
      createdAt: usuario.createdAt,
      updatedAt: usuario.updatedAt,
    };
    return this.criarSessao(usuarioSeguro);
  }

  async renovar(dto: RefreshTokenDto) {
    const payload = await this.verificarRefreshToken(dto.refreshToken);
    const tokenHash = this.hashToken(dto.refreshToken);
    const tokenSalvo = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { usuario: { omit: { senha: true } } },
    });

    if (
      !tokenSalvo ||
      tokenSalvo.usuarioId !== payload.sub ||
      tokenSalvo.expiresAt <= new Date()
    ) {
      throw new UnauthorizedException('Refresh token inválido ou revogado');
    }

    const sessao = await this.prepararSessao(tokenSalvo.usuario);
    try {
      await this.prisma.$transaction([
        this.prisma.refreshToken.delete({ where: { tokenHash } }),
        this.prisma.refreshToken.create({
          data: {
            tokenHash: this.hashToken(sessao.refreshToken),
            expiresAt: sessao.refreshTokenExpiresAt,
            usuarioId: payload.sub,
          },
        }),
      ]);
    } catch {
      throw new UnauthorizedException('Refresh token já utilizado');
    }

    return this.respostaSessao(sessao);
  }

  async logout(dto: RefreshTokenDto): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { tokenHash: this.hashToken(dto.refreshToken) },
    });
  }

  private async criarSessao<T extends { id: number; login: string }>(
    usuario: T,
  ) {
    const sessao = await this.prepararSessao(usuario);
    await this.prisma.refreshToken.create({
      data: {
        tokenHash: this.hashToken(sessao.refreshToken),
        expiresAt: sessao.refreshTokenExpiresAt,
        usuarioId: usuario.id,
      },
    });

    return this.respostaSessao(sessao);
  }

  private async prepararSessao<T extends { id: number; login: string }>(
    usuario: T,
  ) {
    const payload: JwtPayload = { sub: usuario.id, login: usuario.login };
    const refreshExpiresIn = this.config.get<number>(
      'JWT_REFRESH_EXPIRES_IN_SECONDS',
      604800,
    );
    const refreshPayload: RefreshTokenPayload = {
      ...payload,
      type: 'refresh',
      jti: randomUUID(),
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      refreshToken: await this.jwtService.signAsync(refreshPayload, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshExpiresIn,
      }),
      refreshTokenExpiresAt: new Date(Date.now() + refreshExpiresIn * 1000),
      usuario,
    };
  }

  private respostaSessao<T extends { id: number; login: string }>(sessao: {
    accessToken: string;
    refreshToken: string;
    usuario: T;
  }) {
    return {
      accessToken: sessao.accessToken,
      refreshToken: sessao.refreshToken,
      tokenType: 'Bearer',
      usuario: sessao.usuario,
    };
  }

  private async verificarRefreshToken(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        token,
        { secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET') },
      );
      if (payload.type !== 'refresh') throw new Error('Tipo de token inválido');
      return payload;
    } catch {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
