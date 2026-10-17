import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CriarContaDto } from '../contas/dto/criar-conta.dto';
import { mesAtual } from '../contas/competencia';

export const AJUDA = [
  'Para conectar, use o botão "Conectar Telegram" no sistema.',
  '',
  'Para cadastrar uma conta:',
  'add luz 456,45',
  '',
  'Informe o valor sem separador de milhares.',
  'A conta será criada em aberto, sem recorrência.',
].join('\n');

export async function interpretarConta(
  texto: string,
  dataMensagem: number,
): Promise<CriarContaDto> {
  const comando = /^\/?add\s+(.+?)\s+(\d{1,13})(?:[,.](\d{1,2}))?$/i.exec(
    texto.trim(),
  );

  if (!comando) {
    throw new BadRequestException(
      'Comando inválido. Exemplo: add luz 456,45',
    );
  }

  const [, nome, inteiro, decimal] = comando;

  const dto = plainToInstance(CriarContaDto, {
    nome: nome.replace(/\s+/g, ' ').trim(),
    valor: Number(`${inteiro}.${decimal ?? '00'}`),
    mes: mesAtual(new Date(dataMensagem * 1000)),
    recorrencia: false,
    parcela: 1,
    icone: 'wallet',
  });

  const erros = await validate(dto);

  if (erros.length > 0) {
    const mensagens = erros.flatMap((erro) =>
      Object.values(erro.constraints ?? {}),
    );

    throw new BadRequestException(
      mensagens.join(' ') || 'Dados da conta inválidos.',
    );
  }

  return dto;
}