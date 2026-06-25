import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ corto: { limit: 3, ttl: 60000 } }) 
  @HttpCode(HttpStatus.OK) // Devuelve 200 OK en lugar de 201 Created
@Post('login')
login(@Body() loginDto: { email: string; password: string }) {
  return this.authService.login(loginDto.email, loginDto.password);
}

  @Post('refresh')
renovar(@Body() body: { refresh_token: string }) {
  return this.authService.renovarToken(body.refresh_token);
}

@Post('seleccionar-empresa')
async seleccionarEmpresa(
  @Body() body: { empresa_id: string },
  @Request() req: any,  // ← también con : any
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedException('Token requerido');
  }
  const token = authHeader.substring(7);
  return this.authService.seleccionarEmpresaConToken(token, body.empresa_id);
}

@UseGuards(JwtAuthGuard)
@Post('logout')
logout(@Request() req: any) {
  return this.authService.logout(req.user.sub);
}
}