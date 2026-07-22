import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { UsuarioAutenticado } from './auth.types';

type RequestAutenticada = Request & { user: UsuarioAutenticado };

export const UsuarioAtual = createParamDecorator(
  (_data: unknown, context: ExecutionContext): UsuarioAutenticado =>
    context.switchToHttp().getRequest<RequestAutenticada>().user,
);
