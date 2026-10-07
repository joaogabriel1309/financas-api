import { BadRequestException } from '@nestjs/common';

export const MES_REGEX = /^(19\d{2}|[2-9]\d{3})-(0[1-9]|1[0-2])$/;

export function mesAtual(data = new Date()): string {
  const partes = new Intl.DateTimeFormat('en', {
    timeZone: 'America/Cuiaba',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(data);
  return `${partes.find((p) => p.type === 'year')!.value}-${partes.find((p) => p.type === 'month')!.value}`;
}

export function competencia(mes?: string): string {
  const valor = mes ?? mesAtual();
  if (typeof valor !== 'string' || !MES_REGEX.test(valor)) {
    throw new BadRequestException(
      'Informe o mês no formato AAAA-MM (1900 a 9999).',
    );
  }
  return valor;
}

export function indiceMes(mes: string): number {
  const [ano, numero] = mes.split('-').map(Number);
  return ano * 12 + numero - 1;
}

export function somarMeses(mes: string, quantidade: number): string {
  const indice = indiceMes(mes) + quantidade;
  const resultado = `${Math.floor(indice / 12)}-${String((indice % 12) + 1).padStart(2, '0')}`;
  return competencia(resultado);
}
