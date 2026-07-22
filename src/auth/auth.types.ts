export interface JwtPayload {
  sub: number;
  login: string;
}

export interface RefreshTokenPayload extends JwtPayload {
  type: 'refresh';
  jti: string;
}

export interface UsuarioAutenticado {
  id: number;
  nome: string;
  login: string;
  createdAt: Date;
  updatedAt: Date;
}
