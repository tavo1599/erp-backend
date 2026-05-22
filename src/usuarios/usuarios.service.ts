// src/usuarios/usuarios.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { Usuario } from './entities/usuario.entity';
import { EmpresaUsuario } from './entities/empresa-usuario.entity';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(EmpresaUsuario)
    private readonly empresaUsuarioRepository: Repository<EmpresaUsuario>,
  ) {}

  async create(createUsuarioDto: CreateUsuarioDto) {
    const { email, password, nombre, empresa_id, rol } = createUsuarioDto;

    try {
      // 1. Encriptar la contraseña (10 es el nivel de "sal", un estándar muy seguro)
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // 2. Crear y guardar el Usuario
      const nuevoUsuario = this.usuarioRepository.create({
        email,
        nombre,
        password_hash: hashedPassword,
      });
      const usuarioGuardado = await this.usuarioRepository.save(nuevoUsuario);

      // 3. Vincular el Usuario con la Empresa y asignarle su Rol
      const relacionEmpresaUsuario = this.empresaUsuarioRepository.create({
        usuario_id: usuarioGuardado.id,
        empresa_id: empresa_id,
        rol: rol,
      });
      await this.empresaUsuarioRepository.save(relacionEmpresaUsuario);

      // 4. SOLUCIÓN AL ERROR: Extraemos password_hash y renombramos el resto como "usuarioSinPassword"
      const { password_hash, ...usuarioSinPassword } = usuarioGuardado;

      return {
        mensaje: 'Usuario creado y vinculado exitosamente',
        usuario: usuarioSinPassword, // Retornamos el objeto limpio
        rol_asignado: rol
      };

    } catch (error) {
      if (error.code === '23505') {
        throw new BadRequestException('El correo electrónico ya está registrado.');
      }
      throw new BadRequestException('Error al crear el usuario. Verifica que el empresa_id sea válido.');
    }
  }
}