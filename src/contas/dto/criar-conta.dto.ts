import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class CriarContaDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  nome: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  saldoInicial?: number;
}
