import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { UsuarioAtual } from '../auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../auth/auth.types';
import { ContasService } from './contas.service';
import { CriarContaDto } from './dto/criar-conta.dto';

@Controller('contas')
export class ContasController {
  constructor(private readonly contasService: ContasService) {}

  @Post()
  criar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Body() dto: CriarContaDto,
  ) {
    return this.contasService.criar(usuario.id, dto);
  }

  @Get()
  listar(@UsuarioAtual() usuario: UsuarioAutenticado) {
    return this.contasService.listar(usuario.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  excluir(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.contasService.excluir(usuario.id, id);
  }
}
