// src/catalogos/catalogos.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class CatalogosService {
  // ============================================================
  // CATÁLOGO 03: Unidades de medida (lista completa según SUNAT)
  // ============================================================
  private readonly unidadesMedida = [
    { codigo: 'NIU', nombre: 'Unidad (bienes)' },
    { codigo: 'ZZ',  nombre: 'Unidad (servicios)' },
    { codigo: 'KGM', nombre: 'Kilogramo' },
    { codigo: 'GRM', nombre: 'Gramo' },
    { codigo: 'MGM', nombre: 'Miligramo' },
    { codigo: 'TNE', nombre: 'Tonelada métrica' },
    { codigo: 'TON', nombre: 'Tonelada larga' },
    { codigo: 'STN', nombre: 'Tonelada corta' },
    { codigo: 'LBR', nombre: 'Libra' },
    { codigo: 'ONZ', nombre: 'Onza' },
    { codigo: 'LTR', nombre: 'Litro' },
    { codigo: 'MLT', nombre: 'Mililitro' },
    { codigo: 'GLL', nombre: 'Galón' },
    { codigo: 'GLI', nombre: 'Galón inglés (4.545 L)' },
    { codigo: 'BLL', nombre: 'Barril' },
    { codigo: 'OZA', nombre: 'Onza líquida' },
    { codigo: 'MTR', nombre: 'Metro' },
    { codigo: 'CMT', nombre: 'Centímetro' },
    { codigo: 'MMT', nombre: 'Milímetro' },
    { codigo: 'KTM', nombre: 'Kilómetro' },
    { codigo: 'INH', nombre: 'Pulgada' },
    { codigo: 'FOT', nombre: 'Pie' },
    { codigo: 'YRD', nombre: 'Yarda' },
    { codigo: 'MTK', nombre: 'Metro cuadrado' },
    { codigo: 'CMK', nombre: 'Centímetro cuadrado' },
    { codigo: 'MMK', nombre: 'Milímetro cuadrado' },
    { codigo: 'KMK', nombre: 'Kilómetro cuadrado' },
    { codigo: 'FTK', nombre: 'Pie cuadrado' },
    { codigo: 'INK', nombre: 'Pulgada cuadrada' },
    { codigo: 'YDK', nombre: 'Yarda cuadrada' },
    { codigo: 'HAR', nombre: 'Hectárea' },
    { codigo: 'ARE', nombre: 'Área' },
    { codigo: 'ACR', nombre: 'Acre' },
    { codigo: 'MTQ', nombre: 'Metro cúbico' },
    { codigo: 'CMQ', nombre: 'Centímetro cúbico' },
    { codigo: 'MMQ', nombre: 'Milímetro cúbico' },
    { codigo: 'INQ', nombre: 'Pulgada cúbica' },
    { codigo: 'FTQ', nombre: 'Pie cúbico' },
    { codigo: 'YDQ', nombre: 'Yarda cúbica' },
    { codigo: 'DZN', nombre: 'Docena' },
    { codigo: 'DPC', nombre: 'Docena por 100 (gruesa)' },
    { codigo: 'MIL', nombre: 'Millar' },
    { codigo: 'CEN', nombre: 'Ciento' },
    { codigo: 'BX',  nombre: 'Caja' },
    { codigo: 'PK',  nombre: 'Paquete' },
    { codigo: 'BG',  nombre: 'Bolsa' },
    { codigo: 'CT',  nombre: 'Cartón' },
    { codigo: 'CY',  nombre: 'Cilindro' },
    { codigo: 'DR',  nombre: 'Tambor' },
    { codigo: 'CS',  nombre: 'Estuche' },
    { codigo: 'TU',  nombre: 'Tubo' },
    { codigo: 'EA',  nombre: 'Pieza (each)' },
    { codigo: 'PR',  nombre: 'Par' },
    { codigo: 'SET', nombre: 'Juego / Set' },
    { codigo: 'TRY', nombre: 'Bandeja' },
    { codigo: 'PD',  nombre: 'Almohadilla / Block' },
    { codigo: 'RO',  nombre: 'Rollo' },
    { codigo: 'RM',  nombre: 'Resma' },
    { codigo: 'HOJ', nombre: 'Hoja' },
    { codigo: 'CA',  nombre: 'Lata' },
    { codigo: 'BO',  nombre: 'Botella' },
    { codigo: 'JR',  nombre: 'Frasco / Jarro' },
    { codigo: 'BJ',  nombre: 'Balde' },
    { codigo: 'SA',  nombre: 'Saco' },
    { codigo: 'HUR', nombre: 'Hora' },
    { codigo: 'MIN', nombre: 'Minuto' },
    { codigo: 'SEC', nombre: 'Segundo' },
    { codigo: 'DAY', nombre: 'Día' },
    { codigo: 'WEE', nombre: 'Semana' },
    { codigo: 'MON', nombre: 'Mes' },
    { codigo: 'ANN', nombre: 'Año' },
    { codigo: 'KWH', nombre: 'Kilowatt-hora' },
    { codigo: 'WTT', nombre: 'Watt' },
    { codigo: 'AMP', nombre: 'Amperio' },
    { codigo: 'VLT', nombre: 'Voltio' },
    { codigo: 'BTU', nombre: 'BTU (unidad térmica)' },
    { codigo: 'CEL', nombre: 'Grados Celsius' },
    { codigo: 'KEL', nombre: 'Grados Kelvin' },
    { codigo: '4G',  nombre: 'Microlitro' },
    { codigo: '58',  nombre: 'Kilogramo neto' },
  ];

  // ============================================================
  // CATÁLOGO 07: Tipos de afectación del IGV (lista completa)
  // ============================================================
  private readonly tiposAfectacionIgv = [
    // GRAVADAS
    { codigo: '10', nombre: 'Gravado - Operación Onerosa', categoria: 'Gravado' },
    { codigo: '11', nombre: 'Gravado - Retiro por premio', categoria: 'Gravado retiro' },
    { codigo: '12', nombre: 'Gravado - Retiro por donación', categoria: 'Gravado retiro' },
    { codigo: '13', nombre: 'Gravado - Retiro', categoria: 'Gravado retiro' },
    { codigo: '14', nombre: 'Gravado - Retiro por publicidad', categoria: 'Gravado retiro' },
    { codigo: '15', nombre: 'Gravado - Bonificaciones', categoria: 'Gravado retiro' },
    { codigo: '16', nombre: 'Gravado - Retiro por entrega a trabajadores', categoria: 'Gravado retiro' },
    { codigo: '17', nombre: 'Gravado - IVAP (arroz pilado)', categoria: 'Gravado' },
    // EXONERADAS
    { codigo: '20', nombre: 'Exonerado - Operación Onerosa', categoria: 'Exonerado' },
    { codigo: '21', nombre: 'Exonerado - Transferencia gratuita', categoria: 'Exonerado gratuito' },
    // INAFECTAS
    { codigo: '30', nombre: 'Inafecto - Operación Onerosa', categoria: 'Inafecto' },
    { codigo: '31', nombre: 'Inafecto - Retiro por bonificación', categoria: 'Inafecto retiro' },
    { codigo: '32', nombre: 'Inafecto - Retiro', categoria: 'Inafecto retiro' },
    { codigo: '33', nombre: 'Inafecto - Retiro por muestras médicas', categoria: 'Inafecto retiro' },
    { codigo: '34', nombre: 'Inafecto - Retiro por convenio colectivo', categoria: 'Inafecto retiro' },
    { codigo: '35', nombre: 'Inafecto - Retiro por premio', categoria: 'Inafecto retiro' },
    { codigo: '36', nombre: 'Inafecto - Retiro por publicidad', categoria: 'Inafecto retiro' },
    // EXPORTACIÓN
    { codigo: '40', nombre: 'Exportación', categoria: 'Exportación' },
  ];

  // ============================================================
  // CATÁLOGO 06: Tipos de documento de identidad
  // ============================================================
  private readonly tiposDocumento = [
    { codigo: '0', nombre: 'Sin documento (Doc. Trib. NO Dom. Sin RUC)' },
    { codigo: '1', nombre: 'DNI' },
    { codigo: '4', nombre: 'Carnet de extranjería' },
    { codigo: '6', nombre: 'RUC' },
    { codigo: '7', nombre: 'Pasaporte' },
    { codigo: 'A', nombre: 'Cédula diplomática de identidad' },
    { codigo: 'B', nombre: 'Doc. identificación país de residencia (no Perú)' },
    { codigo: 'C', nombre: 'Tax Identification Number (TIN)' },
    { codigo: 'D', nombre: 'Identification Number (IN)' },
  ];

  // ============================================================
  // CATÁLOGO 01: Tipos de comprobante
  // ============================================================
  private readonly tiposComprobante = [
    { codigo: '01', nombre: 'Factura' },
    { codigo: '03', nombre: 'Boleta de venta' },
    { codigo: '07', nombre: 'Nota de crédito' },
    { codigo: '08', nombre: 'Nota de débito' },
    { codigo: '09', nombre: 'Guía de remisión - Remitente' },
    { codigo: '20', nombre: 'Comprobante de retención' },
    { codigo: '31', nombre: 'Guía de remisión - Transportista' },
    { codigo: '40', nombre: 'Comprobante de percepción' },
  ];

  // ============================================================
  // Tipos de moneda (ISO 4217 - los más usados)
  // ============================================================
  private readonly monedas = [
    { codigo: 'PEN', nombre: 'Soles' },
    { codigo: 'USD', nombre: 'Dólares americanos' },
    { codigo: 'EUR', nombre: 'Euros' },
    { codigo: 'GBP', nombre: 'Libras esterlinas' },
    { codigo: 'JPY', nombre: 'Yenes japoneses' },
    { codigo: 'CNY', nombre: 'Yuanes chinos' },
    { codigo: 'BRL', nombre: 'Reales brasileños' },
    { codigo: 'ARS', nombre: 'Pesos argentinos' },
    { codigo: 'CLP', nombre: 'Pesos chilenos' },
    { codigo: 'COP', nombre: 'Pesos colombianos' },
    { codigo: 'MXN', nombre: 'Pesos mexicanos' },
  ];

  // ============================================================
  // CATÁLOGO 09: Motivos de Nota de Crédito
  // ============================================================
  private readonly motivosNotaCredito = [
    { codigo: '01', nombre: 'Anulación de la operación' },
    { codigo: '02', nombre: 'Anulación por error en el RUC' },
    { codigo: '03', nombre: 'Corrección por error en la descripción' },
    { codigo: '04', nombre: 'Descuento global' },
    { codigo: '05', nombre: 'Descuento por ítem' },
    { codigo: '06', nombre: 'Devolución total' },
    { codigo: '07', nombre: 'Devolución por ítem' },
    { codigo: '08', nombre: 'Bonificación' },
    { codigo: '09', nombre: 'Disminución en el valor' },
    { codigo: '10', nombre: 'Otros conceptos' },
    { codigo: '11', nombre: 'Ajustes de operaciones de exportación' },
    { codigo: '12', nombre: 'Ajustes afectos al IVAP' },
    { codigo: '13', nombre: 'Ajustes por retiros gratuitos a empresas' },
  ];

  // ============================================================
  // CATÁLOGO 10: Motivos de Nota de Débito
  // ============================================================
  private readonly motivosNotaDebito = [
    { codigo: '01', nombre: 'Intereses por mora' },
    { codigo: '02', nombre: 'Aumento en el valor' },
    { codigo: '03', nombre: 'Penalidades / otros conceptos' },
    { codigo: '11', nombre: 'Ajustes de operaciones de exportación' },
    { codigo: '12', nombre: 'Ajustes afectos al IVAP' },
  ];

  // ============================================================
  // Condiciones de pago
  // ============================================================
  private readonly condicionesPago = [
    { codigo: 'CONTADO', nombre: 'Contado' },
    { codigo: 'CREDITO', nombre: 'Crédito' },
  ];

  // ============================================================
  // Métodos de pago
  // ============================================================
  private readonly metodosPago = [
    { codigo: 'EFECTIVO', nombre: 'Efectivo' },
    { codigo: 'TRANSFERENCIA', nombre: 'Transferencia bancaria' },
    { codigo: 'YAPE', nombre: 'Yape / Plin' },
    { codigo: 'TARJETA_DEBITO', nombre: 'Tarjeta de débito' },
    { codigo: 'TARJETA_CREDITO', nombre: 'Tarjeta de crédito' },
    { codigo: 'DEPOSITO', nombre: 'Depósito en cuenta' },
    { codigo: 'CHEQUE', nombre: 'Cheque' },
    { codigo: 'OTRO', nombre: 'Otro' },
  ];

  // ============================================================
  // Getters individuales
  // ============================================================
  getUnidadesMedida() { return this.unidadesMedida; }
  getTiposAfectacionIgv() { return this.tiposAfectacionIgv; }
  getTiposDocumento() { return this.tiposDocumento; }
  getTiposComprobante() { return this.tiposComprobante; }
  getMonedas() { return this.monedas; }
  getMotivosNotaCredito() { return this.motivosNotaCredito; }
  getMotivosNotaDebito() { return this.motivosNotaDebito; }
  getCondicionesPago() { return this.condicionesPago; }
  getMetodosPago() { return this.metodosPago; }

  // Todos juntos (para cargar al inicio del frontend, una sola llamada)
  getTodos() {
    return {
      unidades_medida: this.unidadesMedida,
      tipos_afectacion_igv: this.tiposAfectacionIgv,
      tipos_documento: this.tiposDocumento,
      tipos_comprobante: this.tiposComprobante,
      monedas: this.monedas,
      motivos_nota_credito: this.motivosNotaCredito,
      motivos_nota_debito: this.motivosNotaDebito,
      condiciones_pago: this.condicionesPago,
      metodos_pago: this.metodosPago,
    };
  }
}