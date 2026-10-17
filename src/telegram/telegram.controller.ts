import { Controller, Delete, Get, HttpCode, Post } from "@nestjs/common";
import { TelegramVinculoService } from "./telegram.vinculo.service";
import { UsuarioAutenticado } from "src/auth/auth.types";
import { UsuarioAtual } from "src/auth/usuario-atual.decorator";

@Controller('integracoes/telegram')
export class TelegramController {
  constructor(
    private readonly vinculos: TelegramVinculoService
  ) { }

  @Get()
  status(@UsuarioAtual() usuarioId: UsuarioAutenticado) {
    return this.vinculos.status(usuarioId.id);
  }

  @Post('vincular')
  vincular(@UsuarioAtual() usuarioId: UsuarioAutenticado) {
    return this.vinculos.gerarLink(usuarioId.id);
  }

  @Delete()
  @HttpCode(204)
  desconectar(@UsuarioAtual() usuarioId: UsuarioAutenticado) {
    return this.vinculos.desconectar(usuarioId.id);
  }
}