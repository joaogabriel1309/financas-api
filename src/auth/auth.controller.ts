import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import type { UsuarioAutenticado } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { RegistrarDto } from './dto/registrar.dto';
import { Public } from './public.decorator';
import { UsuarioAtual } from './usuario-atual.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('registrar')
  registrar(@Body() dto: RegistrarDto) {
    return this.authService.registrar(dto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  perfil(@UsuarioAtual() usuario: UsuarioAutenticado) {
    return usuario;
  }
}
