import { Controller, Get, Query } from '@nestjs/common';
import type { UsuarioAutenticado } from '../auth/auth.types';
import { UsuarioAtual } from '../auth/usuario-atual.decorator';
import { MesContaDto } from '../contas/dto/mes-conta.dto';
import { PrevisaoService } from './previsao.service';

@Controller('previsao')
export class PrevisaoController {
  constructor(private readonly previsao: PrevisaoService) {}

  @Get()
  mensal(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Query() filtro: MesContaDto,
  ) {
    return this.previsao.mensal(usuario.id, filtro.mes);
  }
}
