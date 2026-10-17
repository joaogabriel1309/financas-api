import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from "@nestjs/config";
import { randomBytes, createHash } from "crypto";
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TelegramVinculoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService
  ) { }

  async status(usuarioId: number) {
    const vinculo = await this.prisma.telegramVinculo.findUnique({
      where: { usuarioId },
      select: { createdAt: true },
    });
    return {
      conectado: !!vinculo,
      criadoEm: vinculo?.createdAt ?? null,
    };
  }

  async gerarLink(usuarioId: number) {
    const username = await this.config.getOrThrow<string>(
      'TELEGRAM_BOT_USERNAME'
    );

    const codigo = randomBytes(32).toString('base64url');
    const hash = this.hash(codigo);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutos

    await this.transaction(async (tx) => {
      const existe = await tx.telegramVinculo.findUnique({
        where: { usuarioId },
        select: { usuarioId: true },
      });

      if (existe) {
        throw new ConflictException(
          'Este usuário já possui um vínculo com o Telegram.'
        );
      }

      await tx.telegramCodigo.upsert({
        where: { usuarioId },
        update: { hash, expiresAt },
        create: { hash, expiresAt, usuarioId },
      });
    })

    return {
      url: `https://t.me/${username}?start=${codigo}`,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async confirmar(
    codigo: string,
    telegramUserId: number,
    chatId: number
  ) {
    if (
      !/^[A-Za-z0-9_-]{43}$/.test(codigo) ||
      !Number.isSafeInteger(telegramUserId) ||
      telegramUserId <= 0 ||
      !Number.isSafeInteger(chatId) ||
      chatId <= 0
    ) {
      throw new ConflictException('Solicitação inválida.');
    }

    await this.transaction(async (tx) => {
      const hash = this.hash(codigo);

      const pendente = await tx.telegramCodigo.findUnique({
        where: { hash },
        select: { expiresAt: true, usuarioId: true },
      });

      if (!pendente || pendente.expiresAt < new Date()) {
        throw new BadRequestException('Link inválido ou expirado. Gere outro no sistema.');
      }

      const consumido = await tx.telegramCodigo.deleteMany({
        where: {
          usuarioId: pendente.usuarioId,
          hash,
          expiresAt: { gt: new Date() },
        },
      });

      if (consumido.count !== 1) {
        throw new ConflictException('Este link já foi utilizado.');
      }

      await tx.telegramVinculo.create({
        data: {
          usuarioId: pendente.usuarioId,
          telegramUserId: BigInt(telegramUserId),
          chatId: BigInt(chatId),
        },
      });
    })
  }

  async desconectar(usuarioId: number) {
    await this.transaction(async (tx) => {
      await tx.telegramCodigo.deleteMany({
        where: { usuarioId },
      });

      await tx.telegramVinculo.deleteMany({
        where: { usuarioId },
      });
    });
  }

  private hash(codigo: string) {
    return createHash('sha256').update(codigo).digest('hex');
  }

  private async transaction<T>(
    executor: (tx: Prisma.TransactionClient) => Promise<T>
  ): Promise<T> {
    try {
      return await this.prisma.$transaction(executor, {
        isolationLevel: 'Serializable',
      });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            'Esta conta ou este Telegram já possui um vínculo.',
          );
        }

        if (error.code === 'P2034') {
          throw new ConflictException(
            'Houve uma alteração simultânea. Tente novamente.',
          );
        }
      }
      throw error;
    }
  }

}