import { IsNotEmpty, IsString, Length } from "class-validator";

export class CreateFormasPagamentoDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  nome!: string;
}
