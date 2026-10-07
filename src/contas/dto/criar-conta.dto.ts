import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { MES_REGEX } from '../competencia';
import { ICONES_CONTA, type IconeConta } from '../icones-conta';

export class CriarContaDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  nome!: string;

  @IsOptional()
  @IsIn(ICONES_CONTA, { message: 'Selecione um ícone válido para a conta.' })
  icone?: IconeConta;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  valor?: number;

  @IsOptional()
  @Matches(MES_REGEX, {
    message: 'mes deve estar no formato AAAA-MM (1900 a 9999)',
  })
  mes?: string;

  @IsOptional()
  @IsBoolean()
  recorrencia?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(360)
  parcela?: number;

  @IsOptional()
  @IsUUID()
  formaPagamentoId?: string | null;
}
