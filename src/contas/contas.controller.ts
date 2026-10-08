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
import { ContasService } from './contas.service';
import { CriarContaDto } from './dto/criar-conta.dto';
import { MesContaDto } from './dto/mes-conta.dto';
import { AlterarFormaPagamentoContaDto } from './dto/alterar-forma-pagamento-conta.dto';
import { AlterarValorContaDto } from './dto/alterar-valor-conta.dto';
import { EditarContaDto } from './dto/editar-conta.dto';

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

  @Get(':id')
  buscar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.contasService.buscar(usuario.id, id);
  }

  @Patch(':id/dados')
  editar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EditarContaDto,
  ) {
    return this.contasService.editar(usuario.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  excluir(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.contasService.excluir(usuario.id, id);
  }

  @Patch(':id')
  alterarFormaPagamento(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AlterarFormaPagamentoContaDto,
  ) {
    return this.contasService.alterarFormaPagamento(usuario.id, id, dto);
  }

  @Patch(':id/valor')
  alterarValor(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AlterarValorContaDto,
  ) {
    return this.contasService.alterarValor(usuario.id, id, dto);
  }
}
