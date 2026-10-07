import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import type { UsuarioAutenticado } from '../auth/auth.types';
import { UsuarioAtual } from '../auth/usuario-atual.decorator';
import { ContasService } from './contas.service';
import { CriarContaDto } from './dto/criar-conta.dto';
import { MesContaDto } from './dto/mes-conta.dto';

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

  @Post(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  pagar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() filtro: MesContaDto,
  ) {
    return this.contasService.pagar(usuario.id, id, filtro.mes);
  }

  @Get()
  listar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Query() filtro: MesContaDto,
  ) {
    return this.contasService.listar(usuario.id, filtro.mes);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  excluir(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.contasService.excluir(usuario.id, id);
  }
}
