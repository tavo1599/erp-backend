// src/auth/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { Rol } from './roles.enum';
import { ROLES_KEY } from './roles.guard';

export const Roles = (...roles: Rol[]) => SetMetadata(ROLES_KEY, roles);