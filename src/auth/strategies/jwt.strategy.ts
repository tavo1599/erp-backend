// src/auth/strategies/jwt.strategy.ts
// 1. IMPORTANTE: Asegúrate de que Strategy venga de 'passport-jwt'
import { ExtractJwt, Strategy } from 'passport-jwt'; 
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // 2. SOLUCIÓN AL ERROR: Le decimos a TypeScript "Confía en mí, te aseguro que es un string"
      secretOrKey: configService.get<string>('JWT_SECRET') as string,
    });
  }

  async validate(payload: any) {
    return {
      usuario_id: payload.sub,
      email: payload.email,
      empresa_id: payload.empresa_id,
      rol: payload.rol
    };
  }
}