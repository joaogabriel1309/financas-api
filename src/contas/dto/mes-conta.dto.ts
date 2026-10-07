import { IsOptional, Matches } from 'class-validator';
import { MES_REGEX } from '../competencia';

export class MesContaDto {
  @IsOptional()
  @Matches(MES_REGEX, {
    message: 'mes deve estar no formato AAAA-MM (1900 a 9999)',
  })
  mes?: string;
}
