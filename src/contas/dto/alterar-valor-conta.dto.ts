import { IsNumber, Max, Min } from 'class-validator';

export class AlterarValorContaDto {
  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(9_999_999_999_999.99)
  valor!: number;
}
