import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { setTimeout as esperar } from 'node:timers/promises';
import { PrismaService } from '../prisma/prisma.service';
import { ContasService } from '../contas/contas.service';
import type { CriarContaDto } from '../contas/dto/criar-conta.dto';
import { TelegramVinculoService } from './telegram.vinculo.service';
import { AJUDA, interpretarConta } from './telegram-command';

type TelegramUser = {
  id: number;
  is_bot: boolean;
  username?: string;
};

type TelegramUpdate = {
  update_id: number;
  message?: {
    date: number;
    text?: string;
    from?: TelegramUser;
    chat: {
      id: number;
      type: string;
    };
  };
};

type TelegramResponse<T> = {
  ok: boolean;
  result?: T;
  error_code?: number;
  parameters?: {
    retry_after?: number;
  };
};

class TelegramApiError extends Error {
  constructor(
    readonly status: number,
    readonly retryAfter = 3,
  ) {
    super('Falha na comunicação com o Telegram.');
  }
}

@Injectable()
export class TelegramService
  implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private readonly abort = new AbortController();

  private token = '';
  private botId = 0n;
  private tarefa?: Promise<void>;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly contas: ContasService,
    private readonly vinculos: TelegramVinculoService,
  ) { }

  async onApplicationBootstrap() {
    if (this.config.get<string>('TELEGRAM_ENABLED') !== 'true') {
      return;
    }

    this.token = this.config.getOrThrow<string>('TELEGRAM_BOT_TOKEN');

    const bot = await this.chamar<TelegramUser>('getMe');

    if (
      !bot.is_bot ||
      !Number.isSafeInteger(bot.id) ||
      bot.id <= 0
    ) {
      throw new Error('Identificação do bot inválida.');
    }

    const username = this.config.getOrThrow<string>(
      'TELEGRAM_BOT_USERNAME',
    );

    if (bot.username?.toLowerCase() !== username.toLowerCase()) {
      throw new Error(
        'TELEGRAM_BOT_USERNAME não corresponde ao token configurado.',
      );
    }

    const webhook = await this.chamar<{ url: string }>(
      'getWebhookInfo',
    );

    if (webhook.url) {
      throw new Error(
        'Este exemplo usa polling, mas o bot já possui um webhook configurado.',
      );
    }

    this.botId = BigInt(bot.id);
    this.tarefa = this.escutar();

    this.logger.log('Integração com Telegram iniciada.');
  }

  async onModuleDestroy() {
    this.abort.abort();
    await this.tarefa;
  }

  private async escutar(): Promise<void> {
    let offset = 0;

    while (!this.abort.signal.aborted) {
      try {
        const updates = await this.chamar<TelegramUpdate[]>(
          'getUpdates',
          {
            offset,
            timeout: 25,
            allowed_updates: ['message'],
          },
        );

        for (const update of updates) {
          if (this.abort.signal.aborted) return;

          await this.processar(update);

          // Só avança depois de concluir o processamento.
          offset = update.update_id + 1;
        }
      } catch (error) {
        if (this.abort.signal.aborted) return;

        this.logger.warn(
          'Falha ao processar Telegram. Uma nova tentativa será feita.',
        );

        const segundos =
          error instanceof TelegramApiError
            ? Math.max(3, error.retryAfter)
            : 3;

        await esperar(segundos * 1000, undefined, {
          signal: this.abort.signal,
        }).catch(() => undefined);
      }
    }
  }

  private async processar(update: TelegramUpdate): Promise<void> {
    const message = update.message;

    // Não aceita grupos, canais, mensagens de bots ou mensagens sem texto.
    if (
      !message?.text ||
      !message.from ||
      message.from.is_bot ||
      message.chat.type !== 'private'
    ) {
      return;
    }

    const texto = message.text.trim();
    const telegramUserId = message.from.id;
    const chatId = message.chat.id;

    let resposta: string;

    try {
      const inicio =
        /^\/start\s+([A-Za-z0-9_-]{43})$/.exec(texto);

      if (inicio) {
        await this.vinculos.confirmar(
          inicio[1],
          telegramUserId,
          chatId,
        );

        resposta =
          'Telegram conectado com sucesso!\n\n' +
          'Agora envie, por exemplo:\nadd luz 456,45';
      } else if (/^\/(start|help)$/i.test(texto)) {
        resposta = AJUDA;
      } else {
        const dto = await interpretarConta(texto, message.date);

        resposta = await this.registrarConta(
          update.update_id,
          telegramUserId,
          chatId,
          dto,
        );
      }
    } catch (error) {
      if (
        !(error instanceof BadRequestException) &&
        !(error instanceof ConflictException)
      ) {
        // Erros inesperados voltam ao polling para nova tentativa.
        throw error;
      }

      resposta = error.message;
    }

    // A comunicação externa acontece depois da transação do banco.
    await this.enviar(chatId, resposta);
  }

  private async registrarConta(
    updateId: number,
    telegramUserId: number,
    chatId: number,
    dto: CriarContaDto,
  ): Promise<string> {
    return this.prisma.$transaction(
      async (tx) => {
        const vinculo = await tx.telegramVinculo.findUnique({
          where: {
            telegramUserId: BigInt(telegramUserId),
          },
        });

        if (!vinculo || vinculo.chatId !== BigInt(chatId)) {
          return (
            'Seu Telegram ainda não está conectado.\n' +
            'Entre no sistema e clique em "Conectar Telegram".'
          );
        }

        const chave = {
          botId: this.botId,
          updateId,
        };

        const anterior = await tx.telegramUpdate.findUnique({
          where: {
            botId_updateId: chave,
          },
        });

        if (anterior) {
          // Não revela respostas de uma conta vinculada anteriormente.
          return anterior.usuarioId === vinculo.usuarioId
            ? anterior.resposta
            : 'Esta mensagem já foi processada. Envie um novo comando.';
        }

        await this.contas.criar(vinculo.usuarioId, dto, tx);

        const valor = new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(dto.valor ?? 0);

        const resposta =
          `Conta "${dto.nome}" cadastrada: ${valor}.`;

        await tx.telegramUpdate.create({
          data: {
            ...chave,
            usuarioId: vinculo.usuarioId,
            resposta,
          },
        });

        return resposta;
      },
      {
        isolationLevel: 'Serializable',
      },
    );
  }

  private async enviar(chatId: number, texto: string) {
    try {
      await this.chamar('sendMessage', {
        chat_id: chatId,
        text: texto,
      });
    } catch (error) {
      // Falhas permanentes na entrega não devem bloquear os outros usuários.
      if (
        error instanceof TelegramApiError &&
        [400, 403].includes(error.status)
      ) {
        this.logger.warn(
          'Não foi possível entregar uma resposta do Telegram.',
        );
        return;
      }

      throw error;
    }
  }

  private async chamar<T>(
    metodo: string,
    dados: Record<string, unknown> = {},
  ): Promise<T> {
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${this.token}/${metodo}`,
        {
          method: 'POST',
          redirect: 'error',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(dados),
          signal: AbortSignal.any([
            this.abort.signal,
            AbortSignal.timeout(35000),
          ]),
        },
      );

      const payload =
        (await response.json()) as TelegramResponse<T>;

      if (
        !response.ok ||
        !payload.ok ||
        payload.result === undefined
      ) {
        throw new TelegramApiError(
          payload.error_code ?? response.status,
          payload.parameters?.retry_after ?? 3,
        );
      }

      return payload.result;
    } catch (error) {
      if (error instanceof TelegramApiError) {
        throw error;
      }

      // Não propaga erros de fetch que possam conter a URL com o token.
      throw new TelegramApiError(0);
    }
  }
}