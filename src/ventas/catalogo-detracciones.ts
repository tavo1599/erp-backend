// src/ventas/catalogo-detracciones.ts

export interface CodigoDetraccion {
  codigo: string;
  descripcion: string;
  porcentaje: number;
  tipo: 'BIEN' | 'SERVICIO';
}

// Catálogo N° 54 de SUNAT - Códigos de detracciones
export const CATALOGO_DETRACCIONES: CodigoDetraccion[] = [
  // BIENES
  { codigo: '001', descripcion: 'Azúcar y melaza de caña', porcentaje: 10, tipo: 'BIEN' },
  { codigo: '002', descripcion: 'Arroz pilado', porcentaje: 3.8, tipo: 'BIEN' },
  { codigo: '003', descripcion: 'Alcohol etílico', porcentaje: 10, tipo: 'BIEN' },
  { codigo: '004', descripcion: 'Recursos hidrobiológicos', porcentaje: 4, tipo: 'BIEN' },
  { codigo: '005', descripcion: 'Maíz amarillo duro', porcentaje: 4, tipo: 'BIEN' },
  { codigo: '008', descripcion: 'Madera', porcentaje: 4, tipo: 'BIEN' },
  { codigo: '009', descripcion: 'Arena y piedra', porcentaje: 10, tipo: 'BIEN' },
  { codigo: '010', descripcion: 'Residuos, subproductos, desechos', porcentaje: 15, tipo: 'BIEN' },
  { codigo: '011', descripcion: 'Bienes gravados con IGV, por renuncia a la exoneración', porcentaje: 10, tipo: 'BIEN' },
  { codigo: '013', descripcion: 'Animales vivos', porcentaje: 4, tipo: 'BIEN' },
  { codigo: '014', descripcion: 'Carnes y despojos comestibles', porcentaje: 4, tipo: 'BIEN' },
  { codigo: '015', descripcion: 'Abonos, cueros y pieles de origen animal', porcentaje: 4, tipo: 'BIEN' },
  { codigo: '016', descripcion: 'Aceite de pescado', porcentaje: 4, tipo: 'BIEN' },
  { codigo: '017', descripcion: 'Harina, polvo y pellets de pescado', porcentaje: 4, tipo: 'BIEN' },
  { codigo: '023', descripcion: 'Leche', porcentaje: 4, tipo: 'BIEN' },
  { codigo: '029', descripcion: 'Algodón', porcentaje: 12, tipo: 'BIEN' },
  { codigo: '031', descripcion: 'Oro gravado con IGV', porcentaje: 10, tipo: 'BIEN' },
  { codigo: '034', descripcion: 'Minerales metálicos no auríferos', porcentaje: 10, tipo: 'BIEN' },
  { codigo: '036', descripcion: 'Bienes exonerados del IGV', porcentaje: 1.5, tipo: 'BIEN' },
  { codigo: '039', descripcion: 'Minerales no metálicos', porcentaje: 10, tipo: 'BIEN' },
  { codigo: '040', descripcion: 'Oro y demás minerales metálicos exonerados', porcentaje: 5, tipo: 'BIEN' },
  
  // SERVICIOS
  { codigo: '012', descripcion: 'Intermediación laboral y tercerización', porcentaje: 12, tipo: 'SERVICIO' },
  { codigo: '019', descripcion: 'Arrendamiento de bienes', porcentaje: 10, tipo: 'SERVICIO' },
  { codigo: '020', descripcion: 'Mantenimiento y reparación de bienes muebles', porcentaje: 12, tipo: 'SERVICIO' },
  { codigo: '021', descripcion: 'Movimiento de carga', porcentaje: 10, tipo: 'SERVICIO' },
  { codigo: '022', descripcion: 'Otros servicios empresariales', porcentaje: 12, tipo: 'SERVICIO' },
  { codigo: '024', descripcion: 'Comisión mercantil', porcentaje: 10, tipo: 'SERVICIO' },
  { codigo: '025', descripcion: 'Fabricación de bienes por encargo', porcentaje: 12, tipo: 'SERVICIO' },
  { codigo: '026', descripcion: 'Servicio de transporte de personas', porcentaje: 10, tipo: 'SERVICIO' },
  { codigo: '027', descripcion: 'Servicio de transporte de carga', porcentaje: 4, tipo: 'SERVICIO' },
  { codigo: '028', descripcion: 'Transporte público de pasajeros vía terrestre', porcentaje: 4, tipo: 'SERVICIO' },
  { codigo: '030', descripcion: 'Contratos de construcción', porcentaje: 4, tipo: 'SERVICIO' },
  { codigo: '037', descripcion: 'Demás servicios gravados con IGV', porcentaje: 12, tipo: 'SERVICIO' },
];

// Monto mínimo para aplicar detracción (S/ 700)
export const MONTO_MINIMO_DETRACCION = 700;

// Helper para obtener código
export function obtenerCodigoDetraccion(codigo: string): CodigoDetraccion | undefined {
  return CATALOGO_DETRACCIONES.find(c => c.codigo === codigo);
}