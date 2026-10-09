import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import type { UsuarioAutenticado } from '../auth/auth.types';
import { UsuarioAtual } from '../auth/usuario-atual.decorator';
import { MesContaDto } from '../contas/dto/mes-conta.dto';
import { SalvarReceitaDto } from './dto/salvar-receita.dto';
import { ReceitasService } from './receitas.service';

@Controller('receitas')
export class ReceitasController {
  constructor(private readonly receitas: ReceitasService) {}

  @Post()
  criar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Body() dto: SalvarReceitaDto,
  ) {
    return this.receitas.criar(usuario.id, dto);
  }

  @Get()
  listar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Query() filtro: MesContaDto,
  ) {
    return this.receitas.listar(usuario.id, filtro.mes);
  }

  @Get(':id')
  buscar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.receitas.buscar(usuario.id, id);
  }

  @Patch(':id')
  editar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SalvarReceitaDto,
  ) {
    return this.receitas.editar(usuario.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  excluir(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.receitas.excluir(usuario.id, id);
  }
}
