import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { EmpresaUsuario } from '../usuarios/entities/empresa-usuario.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)
    private usuarioRepository: Repository<Usuario>,
    @InjectRepository(EmpresaUsuario)
    private empresaUsuarioRepository: Repository<EmpresaUsuario>,
    private jwtService: JwtService,
  ) {}

  async login(email: string, passwordPlana: string) {
    // 1. Buscar al usuario por email
    const usuario = await this.usuarioRepository.findOne({ where: { email } });
    if (!usuario) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    // 2. Comparar la contraseña ingresada con el Hash de la base de datos
    const passwordCoincide = await bcrypt.compare(passwordPlana, usuario.password_hash);
    if (!passwordCoincide) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    // 3. Buscar a qué empresa pertenece y su rol
    const relacion = await this.empresaUsuarioRepository.findOne({ 
      where: { usuario_id: usuario.id } 
    });

    if (!relacion) {
      throw new UnauthorizedException('Este usuario no tiene una empresa asignada');
    }

    // 4. Armar el "Carnet Digital" (Payload del JWT)
    const payload = { 
      sub: usuario.id, // ID del usuario (estándar JWT)
      email: usuario.email, 
      empresa_id: relacion.empresa_id,
      rol: relacion.rol 
    };

    // 5. Devolver el Token al frontend
    return {
      access_token: await this.jwtService.signAsync(payload),
      usuario: {
        nombre: usuario.nombre,
        email: usuario.email,
        rol: relacion.rol
      }
    };
  }
}