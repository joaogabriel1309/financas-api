import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import type { UsuarioAutenticado } from 'src/auth/auth.types';
import { UsuarioAtual } from 'src/auth/usuario-atual.decorator';
import { CreateFormasPagamentoDto } from './dto/create-formas-pagamento.dto';
import { FormasPagamentoService } from './formas-pagamento.service';

@Controller('formas-pagamento')
export class FormasPagamentoController {
  constructor(private readonly formasPagamentoService: FormasPagamentoService) {}

  @Post()
  create(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Body() createFormasPagamentoDto: CreateFormasPagamentoDto
  ) {
    return this.formasPagamentoService.criar(usuario.id, createFormasPagamentoDto);
  }

  @Get()
  findAll(
    @UsuarioAtual() usuario: UsuarioAutenticado
  ) {
    return this.formasPagamentoService.buscarTodos(usuario.id);
  }

  @Get(':id')
  findOne(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('id') id: string
  ) {
    return this.formasPagamentoService.buscarPorId(usuario.id, id);
  }

  @Patch(':id')
  update(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('id') id: string,
    @Body() updateFormasPagamentoDto: CreateFormasPagamentoDto
  ) {
    return this.formasPagamentoService.update(usuario.id, id, updateFormasPagamentoDto);
  }

  @Delete(':id')
  remove(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('id') id: string
  ) {
    return this.formasPagamentoService.remove(usuario.id, id);
  }
}
