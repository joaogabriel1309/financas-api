import { Module } from '@nestjs/common';
import { ContasModule } from '../contas/contas.module';
import { TelegramController } from './telegram.controller';
import { TelegramService } from './telegram.service';
import { TelegramVinculoService } from './telegram.vinculo.service';

@Module({
  imports: [ContasModule],
  controllers: [TelegramController],
  providers: [TelegramService, TelegramVinculoService],
})
export class TelegramModule { }