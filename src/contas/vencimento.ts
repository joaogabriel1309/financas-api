export type SituacaoVencimento =
  'paga' | 'em_aberto' | 'atrasada' | 'vence_hoje' | 'proxima';

const MILISSEGUNDOS_POR_DIA = 86_400_000;
const DIAS_DE_ALERTA = 3;

export function dataHoje(data = new Date()): string {
  const partes = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Cuiaba',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(data);

  const ano = partes.find((p) => p.type === 'year')?.value;
  const mes = partes.find((p) => p.type === 'month')?.value;
  const dia = partes.find((p) => p.type === 'day')?.value;

  return `${ano}-${mes}-${dia}`;
}

export function calculaVencimento(
  mes: string,
  diaVencimento: number | null,
  pago: boolean,
  hoje = dataHoje(),
): {
  dataVencimento: string | null;
  situacaoVencimento: SituacaoVencimento;
} {
  let dataVencimento: string | null = null;

  if (diaVencimento !== null) {
    const [ano, numeroMes] = mes.split('-').map(Number);
    const ultimoDia = new Date(Date.UTC(ano, numeroMes, 0)).getUTCDate();

    const dia = Math.min(diaVencimento, ultimoDia);
    dataVencimento = `${mes}-${String(dia).padStart(2, '0')}`;
  }

  let situacaoVencimento: SituacaoVencimento = pago ? 'paga' : 'em_aberto';

  if (!pago && dataVencimento !== null) {
    // UTC é usado apenas para calcular a distância entre datas.
    // O "hoje" já foi obtido no fuso de Cuiabá.
    const diferencaDias =
      (Date.parse(`${dataVencimento}T00:00:00Z`) -
        Date.parse(`${hoje}T00:00:00Z`)) /
      MILISSEGUNDOS_POR_DIA;

    if (diferencaDias < 0) {
      situacaoVencimento = 'atrasada';
    } else if (diferencaDias === 0) {
      situacaoVencimento = 'vence_hoje';
    } else if (diferencaDias <= DIAS_DE_ALERTA) {
      situacaoVencimento = 'proxima';
    }
  }

  return { dataVencimento, situacaoVencimento };
}
