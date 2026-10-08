import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { MES_REGEX } from '../competencia';
import { ICONES_CONTA, type IconeConta } from '../icones-conta';

export class EditarContaDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(2, 100)
  nome!: string;

  @IsIn(ICONES_CONTA, { message: 'Selecione um ícone válido para a conta.' })
  icone!: IconeConta;

  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(9_999_999_999_999.99)
  valor!: number;

  @Matches(MES_REGEX, {
    message: 'mes deve estar no formato AAAA-MM (1900 a 9999)',
  })
  mes!: string;

  @IsBoolean()
  recorrencia!: boolean;

  @IsInt()
  @Min(1)
  @Max(360)
  parcela!: number;

  @IsOptional()
  @IsUUID()
  formaPagamentoId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  diaVencimento?: number | null;
}
