import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { ContasModule } from './contas/contas.module';
import { FormasPagamentoModule } from './formas-pagamento/formas-pagamento.module';
import { ReceitasModule } from './receitas/receitas.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    ContasModule,
    FormasPagamentoModule,
    ReceitasModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
