import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { EmpresaUsuario } from '../usuarios/entities/empresa-usuario.entity';
import { Empresa } from '../empresas/entities/empresa.entity';

// Tipo para cada empresa que devolvemos
export interface EmpresaInfo {
  id: string;
  ruc: string;
  razon_social: string;
  ambiente: string;
  rol: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)
    private usuarioRepository: Repository<Usuario>,
    @InjectRepository(EmpresaUsuario)
    private empresaUsuarioRepository: Repository<EmpresaUsuario>,
    @InjectRepository(Empresa)
    private empresaRepository: Repository<Empresa>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  private async generarTokens(payload: any) {
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRES') || '15m',
    });

    const refreshToken = crypto.randomBytes(48).toString('hex');
    const expira = new Date();
    expira.setDate(expira.getDate() + 7);

    return { accessToken, refreshToken, expira };
  }

  async login(email: string, passwordPlana: string) {
    const usuario = await this.usuarioRepository.findOne({ where: { email } });
    if (!usuario) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    if (usuario.bloqueado_hasta && new Date() < usuario.bloqueado_hasta) {
      const minutosRestantes = Math.ceil(
        (usuario.bloqueado_hasta.getTime() - new Date().getTime()) / 60000,
      );
      throw new UnauthorizedException(
        `Cuenta bloqueada por intentos fallidos. Intenta en ${minutosRestantes} minutos.`,
      );
    }

    const passwordCoincide = await bcrypt.compare(passwordPlana, usuario.password_hash);
    if (!passwordCoincide) {
      usuario.intentos_fallidos = (usuario.intentos_fallidos || 0) + 1;
      if (usuario.intentos_fallidos >= 5) {
        const bloqueoHasta = new Date();
        bloqueoHasta.setMinutes(bloqueoHasta.getMinutes() + 15);
        usuario.bloqueado_hasta = bloqueoHasta;
        usuario.intentos_fallidos = 0;
        await this.usuarioRepository.save(usuario);
        throw new UnauthorizedException(
          'Demasiados intentos fallidos. Cuenta bloqueada por 15 minutos.',
        );
      }
      await this.usuarioRepository.save(usuario);
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    usuario.intentos_fallidos = 0;
    usuario.bloqueado_hasta = null;
    await this.usuarioRepository.save(usuario);

    const relaciones = await this.empresaUsuarioRepository.find({
      where: { usuario_id: usuario.id },
    });
    if (relaciones.length === 0) {
      throw new UnauthorizedException('Este usuario no tiene empresas asignadas');
    }

    // ARRAY TIPADO
    const empresas: EmpresaInfo[] = [];
    for (const rel of relaciones) {
      const empresa = await this.empresaRepository.findOne({
        where: { id: rel.empresa_id },
      });
      if (empresa) {
        empresas.push({
          id: empresa.id,
          ruc: empresa.ruc,
          razon_social: empresa.razon_social,
          ambiente: empresa.ambiente,
          rol: rel.rol,
        });
      }
    }

    // UNA sola empresa: JWT directo
    if (empresas.length === 1) {
      const emp = empresas[0];
      const payload = {
        sub: usuario.id,
        email: usuario.email,
        empresa_id: emp.id,
        rol: emp.rol,
      };

      const { accessToken, refreshToken, expira } = await this.generarTokens(payload);
      usuario.refresh_token = refreshToken;
      usuario.refresh_token_expira = expira;
      await this.usuarioRepository.save(usuario);

      return {
        access_token: accessToken,
        refresh_token: refreshToken,
        requiere_seleccion: false,
        usuario: {
          nombre: usuario.nombre,
          email: usuario.email,
          rol: emp.rol,
        },
        empresas,
      };
    }

    // VARIAS empresas: token temporal
    const payloadTemporal = {
      sub: usuario.id,
      email: usuario.email,
      seleccion_pendiente: true,
    };

    const accessTokenTemporal = await this.jwtService.signAsync(payloadTemporal, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: '10m',
    });

    return {
      access_token: accessTokenTemporal,
      refresh_token: null,
      requiere_seleccion: true,
      usuario: {
        nombre: usuario.nombre,
        email: usuario.email,
        rol: null,
      },
      empresas,
    };
  }

  // ============================================================
  // SELECCIONAR EMPRESA (con validación de token temporal)
  // ============================================================
  async seleccionarEmpresaConToken(token: string, empresaId: string) {
    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    if (!payload.sub) {
      throw new UnauthorizedException('Token sin usuario válido');
    }

    return this.seleccionarEmpresa(payload.sub, empresaId);
  }

  async seleccionarEmpresa(usuarioId: string, empresaId: string) {
    const usuario = await this.usuarioRepository.findOne({ where: { id: usuarioId } });
    if (!usuario) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const relacion = await this.empresaUsuarioRepository.findOne({
      where: { usuario_id: usuarioId, empresa_id: empresaId },
    });
    if (!relacion) {
      throw new ForbiddenException('No perteneces a esta empresa');
    }

    const empresa = await this.empresaRepository.findOne({
      where: { id: empresaId },
    });
    if (!empresa) {
      throw new UnauthorizedException('Empresa no encontrada');
    }

    const payload = {
      sub: usuario.id,
      email: usuario.email,
      empresa_id: empresa.id,
      rol: relacion.rol,
    };

    const { accessToken, refreshToken, expira } = await this.generarTokens(payload);
    usuario.refresh_token = refreshToken;
    usuario.refresh_token_expira = expira;
    await this.usuarioRepository.save(usuario);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      usuario: {
        nombre: usuario.nombre,
        email: usuario.email,
        rol: relacion.rol,
      },
      empresa: {
        id: empresa.id,
        ruc: empresa.ruc,
        razon_social: empresa.razon_social,
        ambiente: empresa.ambiente,
      },
    };
  }

  async renovarToken(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token requerido');
    }

    const usuario = await this.usuarioRepository.findOne({
      where: { refresh_token: refreshToken },
    });

    if (!usuario) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    if (!usuario.refresh_token_expira || new Date() > usuario.refresh_token_expira) {
      throw new UnauthorizedException('Refresh token expirado, vuelve a iniciar sesión');
    }

    const relacion = await this.empresaUsuarioRepository.findOne({
      where: { usuario_id: usuario.id },
    });
    if (!relacion) {
      throw new UnauthorizedException('Sin empresa asignada');
    }

    const payload = {
      sub: usuario.id,
      email: usuario.email,
      empresa_id: relacion.empresa_id,
      rol: relacion.rol,
    };

    const { accessToken, refreshToken: nuevoRefresh, expira } = await this.generarTokens(payload);

    usuario.refresh_token = nuevoRefresh;
    usuario.refresh_token_expira = expira;
    await this.usuarioRepository.save(usuario);

    return {
      access_token: accessToken,
      refresh_token: nuevoRefresh,
    };
  }

  async logout(usuarioId: string) {
    const usuario = await this.usuarioRepository.findOne({
      where: { id: usuarioId },
    });
    if (usuario) {
      usuario.refresh_token = null;
      usuario.refresh_token_expira = null;
      await this.usuarioRepository.save(usuario);
    }
    return { mensaje: 'Sesión cerrada' };
  }
}