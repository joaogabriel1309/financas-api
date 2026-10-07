import { IsUUID, ValidateIf } from 'class-validator';

export class AlterarFormaPagamentoContaDto {
  // O campo é obrigatório; null é a escolha explícita de remover o vínculo.
  @ValidateIf((_obj: unknown, value: unknown) => value !== null)
  @IsUUID()
  formaPagamentoId!: string | null;
}
