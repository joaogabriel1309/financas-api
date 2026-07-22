import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { RegistrarDto } from './dto/registrar.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
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

  private async criarSessao<T extends { id: number; login: string }>(
    usuario: T,
  ) {
    const payload: JwtPayload = { sub: usuario.id, login: usuario.login };
    return {
      accessToken: await this.jwtService.signAsync(payload),
      tokenType: 'Bearer',
      usuario,
    };
  }
}
