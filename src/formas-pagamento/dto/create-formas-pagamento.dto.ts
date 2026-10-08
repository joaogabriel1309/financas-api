import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import {
  ICONES_FORMA_PAGAMENTO,
  type IconeFormaPagamento,
} from '../aparencia-forma-pagamento';

export class CreateFormasPagamentoDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  nome!: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/, {
    message: 'Informe uma cor hexadecimal válida, como #0874df.',
  })
  cor?: string;

  @IsOptional()
  @IsIn(ICONES_FORMA_PAGAMENTO, {
    message: 'Selecione um ícone válido para a forma de pagamento.',
  })
  icone?: IconeFormaPagamento;
}
