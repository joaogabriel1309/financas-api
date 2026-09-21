import { Module } from '@nestjs/common';
import { FormasPagamentoService } from './formas-pagamento.service';
import { FormasPagamentoController } from './formas-pagamento.controller';

@Module({
  controllers: [FormasPagamentoController],
  providers: [FormasPagamentoService],
})
export class FormasPagamentoModule {}
