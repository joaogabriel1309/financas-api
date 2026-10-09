import { Module } from '@nestjs/common';
import { PrevisaoController } from './previsao.controller';
import { PrevisaoService } from './previsao.service';

@Module({ controllers: [PrevisaoController], providers: [PrevisaoService] })
export class PrevisaoModule {}
