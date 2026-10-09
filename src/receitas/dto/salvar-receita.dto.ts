import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { MES_REGEX } from '../../contas/competencia';

export class SalvarReceitaDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(2, 100)
  nome!: string;

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
}
