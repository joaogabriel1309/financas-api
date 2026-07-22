import { IsNotEmpty, IsString, Length, MinLength } from 'class-validator';

export class RegistrarDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  nome: string;

  @IsString()
  @IsNotEmpty()
  @Length(3, 50)
  login: string;

  @IsString()
  @MinLength(8)
  senha: string;
}
