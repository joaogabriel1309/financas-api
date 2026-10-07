import { competencia, indiceMes, mesAtual, somarMeses } from './competencia';

describe('Competência mensal', () => {
  it('usa o mês de Cuiabá, não o mês UTC na virada', () => {
    expect(mesAtual(new Date('2026-11-01T02:00:00Z'))).toBe('2026-10');
    expect(mesAtual(new Date('2026-11-01T04:00:00Z'))).toBe('2026-11');
  });
  it('avança dezembro para janeiro e fevereiro sem depender do dia', () => {
    expect(somarMeses('2026-12', 1)).toBe('2027-01');
    expect(somarMeses('2026-12', 2)).toBe('2027-02');
    expect(indiceMes('2027-01') - indiceMes('2026-12')).toBe(1);
  });
  it.each([
    '2026-00',
    '2026-13',
    '2026-1',
    '26-01',
    '0000-01',
    '1899-12',
    '2026-10-01',
    '',
  ])('rejeita %s', (mes) => {
    expect(() => competencia(mes)).toThrow();
  });
  it('rejeita parcelas que ultrapassem o último ano aceito', () => {
    expect(() => somarMeses('9999-12', 1)).toThrow();
  });
});
