// src/dashboard/dashboard.service.ts
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Venta } from '../ventas/entities/venta.entity';
import { VentaDetalle } from '../ventas/entities/venta-detalle.entity';
import { Compra } from '../compras/entities/compra.entity';
import { Producto } from '../productos/entities/producto.entity';

@Injectable()
export class DashboardService {
  constructor(private readonly dataSource: DataSource) {}

  // Resumen general del mes actual
  async resumen(empresaId: string) {
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);
    const inicioMesStr = inicioMes.toISOString().split('T')[0];

    // Ventas aceptadas del mes
    const ventas = await this.dataSource
      .getRepository(Venta)
      .createQueryBuilder('v')
      .select('COUNT(*)', 'cantidad')
      .addSelect('COALESCE(SUM(v.importe_total), 0)', 'total')
      .where('v.empresa_id = :empresaId', { empresaId })
      .andWhere('v.estado_sunat = :estado', { estado: 'ACEPTADO' })
      .andWhere('v.fecha_emision >= :inicio', { inicio: inicioMesStr })
      .getRawOne();

    // Compras del mes
    const compras = await this.dataSource
      .getRepository(Compra)
      .createQueryBuilder('c')
      .select('COUNT(*)', 'cantidad')
      .addSelect('COALESCE(SUM(c.importe_total), 0)', 'total')
      .where('c.empresa_id = :empresaId', { empresaId })
      .andWhere('c.fecha_compra >= :inicio', { inicio: inicioMesStr })
      .getRawOne();

    // Conteo de comprobantes por estado (mes)
    const porEstado = await this.dataSource
      .getRepository(Venta)
      .createQueryBuilder('v')
      .select('v.estado_sunat', 'estado')
      .addSelect('COUNT(*)', 'cantidad')
      .where('v.empresa_id = :empresaId', { empresaId })
      .andWhere('v.fecha_emision >= :inicio', { inicio: inicioMesStr })
      .groupBy('v.estado_sunat')
      .getRawMany();

    return {
      periodo: 'Mes actual',
      ventas: {
        cantidad: Number(ventas.cantidad),
        total: Number(ventas.total),
      },
      compras: {
        cantidad: Number(compras.cantidad),
        total: Number(compras.total),
      },
      utilidad_bruta: Number(ventas.total) - Number(compras.total),
      comprobantes_por_estado: porEstado.map((e) => ({
        estado: e.estado,
        cantidad: Number(e.cantidad),
      })),
    };
  }

  // Top de productos más vendidos (por cantidad)
  async productosMasVendidos(empresaId: string, limite = 10) {
    const resultado = await this.dataSource
      .getRepository(VentaDetalle)
      .createQueryBuilder('det')
      .innerJoin(Venta, 'v', 'v.id = det.venta_id')
      .innerJoin(Producto, 'p', 'p.id = det.producto_id')
      .select('p.nombre', 'producto')
      .addSelect('p.id', 'producto_id')
      .addSelect('SUM(det.cantidad)', 'cantidad_vendida')
      .addSelect('SUM(det.subtotal)', 'total_vendido')
      .where('v.empresa_id = :empresaId', { empresaId })
      .andWhere('v.estado_sunat = :estado', { estado: 'ACEPTADO' })
      .groupBy('p.id')
      .addGroupBy('p.nombre')
      .orderBy('SUM(det.cantidad)', 'DESC')
      .limit(limite)
      .getRawMany();

    return resultado.map((r) => ({
      producto: r.producto,
      producto_id: r.producto_id,
      cantidad_vendida: Number(r.cantidad_vendida),
      total_vendido: Number(r.total_vendido),
    }));
  }

  // Productos con stock bajo (por debajo de un umbral)
  async stockBajo(empresaId: string, umbral = 10) {
    const productos = await this.dataSource
      .getRepository(Producto)
      .createQueryBuilder('p')
      .where('p.empresa_id = :empresaId', { empresaId })
      .andWhere('p.estado = true')
      .andWhere('p.stock_actual <= :umbral', { umbral })
      .orderBy('p.stock_actual', 'ASC')
      .getMany();

    return productos.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      stock_actual: Number(p.stock_actual),
      unidad_medida: p.unidad_medida,
    }));
  }

  // Ventas por día (últimos N días) para gráfica de tendencia
  async ventasPorDia(empresaId: string, dias = 30) {
    const desde = new Date();
    desde.setDate(desde.getDate() - dias);
    const desdeStr = desde.toISOString().split('T')[0];

    const resultado = await this.dataSource
      .getRepository(Venta)
      .createQueryBuilder('v')
      .select('DATE(v.fecha_emision)', 'fecha')
      .addSelect('COUNT(*)', 'cantidad')
      .addSelect('COALESCE(SUM(v.importe_total), 0)', 'total')
      .where('v.empresa_id = :empresaId', { empresaId })
      .andWhere('v.estado_sunat = :estado', { estado: 'ACEPTADO' })
      .andWhere('v.fecha_emision >= :desde', { desde: desdeStr })
      .groupBy('DATE(v.fecha_emision)')
      .orderBy('DATE(v.fecha_emision)', 'ASC')
      .getRawMany();

    return resultado.map((r) => ({
      fecha: r.fecha,
      cantidad: Number(r.cantidad),
      total: Number(r.total),
    }));
  }

  // Helper: calcula el % de cambio entre dos valores
  private calcularCambio(actual: number, anterior: number) {
    if (anterior === 0) {
      return { porcentaje: actual > 0 ? 100 : 0, tendencia: actual > 0 ? 'sube' : 'igual' };
    }
    const porcentaje = ((actual - anterior) / anterior) * 100;
    return {
      porcentaje: Number(porcentaje.toFixed(1)),
      tendencia: porcentaje > 0 ? 'sube' : porcentaje < 0 ? 'baja' : 'igual',
    };
  }

  // Helper: suma de ventas aceptadas en un rango de fechas
  private async sumarVentas(empresaId: string, desde: string, hasta: string) {
    const r = await this.dataSource
      .getRepository(Venta)
      .createQueryBuilder('v')
      .select('COUNT(*)', 'cantidad')
      .addSelect('COALESCE(SUM(v.importe_total), 0)', 'total')
      .where('v.empresa_id = :empresaId', { empresaId })
      .andWhere('v.estado_sunat = :estado', { estado: 'ACEPTADO' })
      .andWhere('v.fecha_emision >= :desde', { desde })
      .andWhere('v.fecha_emision <= :hasta', { hasta: hasta + ' 23:59:59' })
      .getRawOne();
    return { cantidad: Number(r.cantidad), total: Number(r.total) };
  }

  // KPIs principales con comparativas
  async kpis(empresaId: string) {
    const hoy = new Date();
    const fmt = (d: Date) => d.toISOString().split('T')[0];

    // --- HOY vs AYER ---
    const hoyStr = fmt(hoy);
    const ayer = new Date(hoy); ayer.setDate(ayer.getDate() - 1);
    const ayerStr = fmt(ayer);

    const ventasHoy = await this.sumarVentas(empresaId, hoyStr, hoyStr);
    const ventasAyer = await this.sumarVentas(empresaId, ayerStr, ayerStr);

    // --- MES ACTUAL vs MES ANTERIOR ---
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const inicioMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    const finMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0);

    const ventasMes = await this.sumarVentas(empresaId, fmt(inicioMes), hoyStr);
    const ventasMesAnterior = await this.sumarVentas(
      empresaId, fmt(inicioMesAnterior), fmt(finMesAnterior),
    );

    // --- AÑO ACTUAL vs AÑO ANTERIOR ---
    const inicioAnio = new Date(hoy.getFullYear(), 0, 1);
    const inicioAnioAnterior = new Date(hoy.getFullYear() - 1, 0, 1);
    const finAnioAnterior = new Date(hoy.getFullYear() - 1, 11, 31);

    const ventasAnio = await this.sumarVentas(empresaId, fmt(inicioAnio), hoyStr);
    const ventasAnioAnterior = await this.sumarVentas(
      empresaId, fmt(inicioAnioAnterior), fmt(finAnioAnterior),
    );

    // --- TICKET PROMEDIO (mes actual) ---
    const ticketPromedio = ventasMes.cantidad > 0 ? ventasMes.total / ventasMes.cantidad : 0;

    return {
      hoy: {
        total: ventasHoy.total,
        cantidad: ventasHoy.cantidad,
        comparacion_ayer: this.calcularCambio(ventasHoy.total, ventasAyer.total),
      },
      mes: {
        total: ventasMes.total,
        cantidad: ventasMes.cantidad,
        comparacion_mes_anterior: this.calcularCambio(ventasMes.total, ventasMesAnterior.total),
        total_mes_anterior: ventasMesAnterior.total,
      },
      anio: {
        total: ventasAnio.total,
        cantidad: ventasAnio.cantidad,
        comparacion_anio_anterior: this.calcularCambio(ventasAnio.total, ventasAnioAnterior.total),
      },
      ticket_promedio: Number(ticketPromedio.toFixed(2)),
    };
  }

  // Rentabilidad por producto (utilidad = ventas - costo)
  async rentabilidadProductos(empresaId: string, limite = 20) {
    // 1. Cantidad y total vendido por producto (ventas aceptadas)
    const ventas = await this.dataSource
      .getRepository(VentaDetalle)
      .createQueryBuilder('det')
      .innerJoin(Venta, 'v', 'v.id = det.venta_id')
      .innerJoin(Producto, 'p', 'p.id = det.producto_id')
      .select('p.id', 'producto_id')
      .addSelect('p.nombre', 'nombre')
      .addSelect('SUM(det.cantidad)', 'cantidad_vendida')
      .addSelect('SUM(det.subtotal)', 'total_vendido')
      .where('v.empresa_id = :empresaId', { empresaId })
      .andWhere('v.estado_sunat = :estado', { estado: 'ACEPTADO' })
      .groupBy('p.id')
      .addGroupBy('p.nombre')
      .getRawMany();

    // 2. Costo promedio por producto (de las compras)
    const costos = await this.dataSource
      .getRepository('compra_detalles')
      .createQueryBuilder('cd')
      .select('cd.producto_id', 'producto_id')
      .addSelect('AVG(cd.costo_unitario)', 'costo_promedio')
      .groupBy('cd.producto_id')
      .getRawMany();

    // Mapa de costos para búsqueda rápida
    const mapaCostos = new Map<string, number>();
    for (const c of costos) {
      mapaCostos.set(c.producto_id, Number(c.costo_promedio));
    }

    // 3. Calcular utilidad por producto
    const resultado = ventas.map((v) => {
      const cantidadVendida = Number(v.cantidad_vendida);
      const totalVendido = Number(v.total_vendido); // este es CON IGV (subtotal)
      const totalVendidoSinIgv = totalVendido / 1.18; // valor real de venta

      const costoUnitario = mapaCostos.get(v.producto_id);
      const tieneCosto = costoUnitario !== undefined;

      // El costo también incluye IGV, lo pasamos a sin IGV
      const costoTotalSinIgv = tieneCosto
        ? (costoUnitario / 1.18) * cantidadVendida
        : 0;

          // Calculamos como número (sin null) para evitar el error de TypeScript
      const utilidadNum = totalVendidoSinIgv - costoTotalSinIgv;
      const margenNum = totalVendidoSinIgv > 0
        ? Number(((utilidadNum / totalVendidoSinIgv) * 100).toFixed(1))
        : 0;

      // Decidimos el null al final, según si tiene costo
      const utilidad = tieneCosto ? Number(utilidadNum.toFixed(2)) : null;
      const margen = tieneCosto ? margenNum : null;

      return {
        producto_id: v.producto_id,
        nombre: v.nombre,
        cantidad_vendida: cantidadVendida,
        total_vendido: Number(totalVendidoSinIgv.toFixed(2)),
        costo_total: tieneCosto ? Number(costoTotalSinIgv.toFixed(2)) : null,
        utilidad: utilidad,
        margen_porcentaje: margen,
        tiene_costo: tieneCosto,
      };
    });

    // Ordenar por utilidad (los que más ganan primero)
    resultado.sort((a, b) => (b.utilidad || 0) - (a.utilidad || 0));

    return resultado.slice(0, limite);
  }

  // Alertas automáticas del negocio
  async alertas(empresaId: string) {
    const alertas: Array<{ tipo: string; nivel: string; mensaje: string; dato?: any }> = [];

    // 1. Stock bajo (<= 10)
    const stockBajo = await this.dataSource
      .getRepository(Producto)
      .createQueryBuilder('p')
      .where('p.empresa_id = :empresaId', { empresaId })
      .andWhere('p.estado = true')
      .andWhere('p.stock_actual <= 10')
      .orderBy('p.stock_actual', 'ASC')
      .getMany();

    for (const p of stockBajo) {
      alertas.push({
        tipo: 'STOCK_BAJO',
        nivel: Number(p.stock_actual) <= 3 ? 'critico' : 'advertencia',
        mensaje: `Stock bajo: "${p.nombre}" tiene ${p.stock_actual} ${p.unidad_medida}`,
        dato: { producto_id: p.id, stock: Number(p.stock_actual) },
      });
    }

    // 2. Productos sin movimiento (creados hace más de 30 días sin ventas)
    const sinMovimiento = await this.dataSource
      .getRepository(Producto)
      .createQueryBuilder('p')
      .where('p.empresa_id = :empresaId', { empresaId })
      .andWhere('p.estado = true')
      .andWhere('p.created_at < NOW() - INTERVAL \'30 days\'')
      .andWhere((qb) => {
        const sub = qb
          .subQuery()
          .select('1')
          .from(VentaDetalle, 'det')
          .innerJoin(Venta, 'v', 'v.id = det.venta_id')
          .where('det.producto_id = p.id')
          .andWhere('v.estado_sunat = :est', { est: 'ACEPTADO' })
          .getQuery();
        return `NOT EXISTS ${sub}`;
      })
      .getMany();

    for (const p of sinMovimiento) {
      alertas.push({
        tipo: 'SIN_MOVIMIENTO',
        nivel: 'info',
        mensaje: `"${p.nombre}" no se ha vendido en más de 30 días`,
        dato: { producto_id: p.id },
      });
    }

    // 3. Caída de ventas: comparar este mes vs anterior
    const hoy = new Date();
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const inicioMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    const finMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0);

    const mesActual = await this.sumarVentas(empresaId, fmt(inicioMes), fmt(hoy));
    const mesAnterior = await this.sumarVentas(empresaId, fmt(inicioMesAnterior), fmt(finMesAnterior));

    if (mesAnterior.total > 0) {
      const cambio = ((mesActual.total - mesAnterior.total) / mesAnterior.total) * 100;
      if (cambio < -15) {
        alertas.push({
          tipo: 'CAIDA_VENTAS',
          nivel: 'critico',
          mensaje: `Las ventas cayeron ${Math.abs(cambio).toFixed(1)}% respecto al mes anterior`,
          dato: { cambio: Number(cambio.toFixed(1)) },
        });
      }
    }

    return {
      total: alertas.length,
      alertas,
    };
  }

  // Segmentación de clientes (RFM simplificado)
// Segmentación de clientes (RFM simplificado)
  async segmentacionClientes(empresaId: string) {
    // Agrupamos las ventas aceptadas por cliente (documento)
    const clientes = await this.dataSource
      .getRepository(Venta)
      .createQueryBuilder('v')
      .select('v.cliente_numero_documento', 'documento')
      .addSelect('v.cliente_razon_social', 'razon_social')
      .addSelect('COUNT(*)', 'frecuencia')
      .addSelect('COALESCE(SUM(v.importe_total), 0)', 'total_gastado')
      .addSelect('MAX(v.fecha_emision)', 'ultima_compra')
      .where('v.empresa_id = :empresaId', { empresaId })
      .andWhere('v.estado_sunat = :estado', { estado: 'ACEPTADO' })
      .groupBy('v.cliente_numero_documento')
      .addGroupBy('v.cliente_razon_social')
      .getRawMany();

    const hoy = new Date();

    const resultado = clientes.map((c) => {
      const frecuencia = Number(c.frecuencia);
      const totalGastado = Number(c.total_gastado);
      const ultimaCompra = new Date(c.ultima_compra);
      const diasSinComprar = Math.floor(
        (hoy.getTime() - ultimaCompra.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Clasificación simple por segmento
      let segmento: string;
      if (diasSinComprar > 90) {
        segmento = 'Inactivo';
      } else if (frecuencia >= 5 && totalGastado >= 1000) {
        segmento = 'VIP';
      } else if (frecuencia >= 3) {
        segmento = 'Frecuente';
      } else {
        segmento = 'Ocasional';
      }

      return {
        documento: c.documento,
        razon_social: c.razon_social,
        frecuencia,
        total_gastado: Number(totalGastado.toFixed(2)),
        dias_sin_comprar: diasSinComprar,
        ultima_compra: c.ultima_compra,
        segmento,
      };
    });

    // Ordenar por total gastado (mejores clientes primero)
    resultado.sort((a, b) => b.total_gastado - a.total_gastado);

    // Resumen por segmento
    const porSegmento = {
      VIP: resultado.filter((c) => c.segmento === 'VIP').length,
      Frecuente: resultado.filter((c) => c.segmento === 'Frecuente').length,
      Ocasional: resultado.filter((c) => c.segmento === 'Ocasional').length,
      Inactivo: resultado.filter((c) => c.segmento === 'Inactivo').length,
    };

    return {
      resumen: porSegmento,
      clientes: resultado,
    };
  }

  // Proyección de agotamiento de stock
  async proyeccionStock(empresaId: string, diasAnalisis = 30) {
    const desde = new Date();
    desde.setDate(desde.getDate() - diasAnalisis);
    const desdeStr = desde.toISOString().split('T')[0];

    // Cantidad vendida de cada producto en los últimos N días
    const ventas = await this.dataSource
      .getRepository(VentaDetalle)
      .createQueryBuilder('det')
      .innerJoin(Venta, 'v', 'v.id = det.venta_id')
      .select('det.producto_id', 'producto_id')
      .addSelect('SUM(det.cantidad)', 'cantidad_vendida')
      .where('v.empresa_id = :empresaId', { empresaId })
      .andWhere('v.estado_sunat = :estado', { estado: 'ACEPTADO' })
      .andWhere('v.fecha_emision >= :desde', { desde: desdeStr })
      .groupBy('det.producto_id')
      .getRawMany();

    const mapaVentas = new Map<string, number>();
    for (const v of ventas) {
      mapaVentas.set(v.producto_id, Number(v.cantidad_vendida));
    }

    // Productos activos con su stock
    const productos = await this.dataSource
      .getRepository(Producto)
      .createQueryBuilder('p')
      .where('p.empresa_id = :empresaId', { empresaId })
      .andWhere('p.estado = true')
      .getMany();

    const resultado = productos.map((p) => {
      const vendidoEnPeriodo = mapaVentas.get(p.id) || 0;
      const ventaDiariaPromedio = vendidoEnPeriodo / diasAnalisis;
      const stockActual = Number(p.stock_actual);

      // Días hasta agotarse
      let diasParaAgotar: number | null = null;
      let alerta = false;

      if (ventaDiariaPromedio > 0) {
        diasParaAgotar = Math.floor(stockActual / ventaDiariaPromedio);
        alerta = diasParaAgotar <= 15; // alerta si se agota en 15 días o menos
      }

      return {
        producto_id: p.id,
        nombre: p.nombre,
        stock_actual: stockActual,
        venta_diaria_promedio: Number(ventaDiariaPromedio.toFixed(2)),
        dias_para_agotar: diasParaAgotar,
        sin_rotacion: ventaDiariaPromedio === 0,
        alerta,
      };
    });

    // Primero los que se agotan más pronto (con alerta)
    resultado.sort((a, b) => {
      if (a.dias_para_agotar === null) return 1;
      if (b.dias_para_agotar === null) return -1;
      return a.dias_para_agotar - b.dias_para_agotar;
    });

    return resultado;
  }

  // Valorización del inventario (cuánto vale el stock en dinero)
  async valorizacionInventario(empresaId: string) {
    // Costo promedio por producto (de las compras)
    const costos = await this.dataSource
      .getRepository('compra_detalles')
      .createQueryBuilder('cd')
      .select('cd.producto_id', 'producto_id')
      .addSelect('AVG(cd.costo_unitario)', 'costo_promedio')
      .groupBy('cd.producto_id')
      .getRawMany();

    const mapaCostos = new Map<string, number>();
    for (const c of costos) {
      mapaCostos.set(c.producto_id, Number(c.costo_promedio));
    }

    // Productos activos con stock
    const productos = await this.dataSource
      .getRepository(Producto)
      .createQueryBuilder('p')
      .where('p.empresa_id = :empresaId', { empresaId })
      .andWhere('p.estado = true')
      .getMany();

    let valorTotalCosto = 0;
    let valorTotalVenta = 0;

    const detalle = productos.map((p) => {
      const stock = Number(p.stock_actual);
      const costoUnitario = mapaCostos.get(p.id) || 0;
      const precioVenta = Number(p.precio_venta);

      const valorCosto = stock * costoUnitario;
      const valorVenta = stock * precioVenta;

      valorTotalCosto += valorCosto;
      valorTotalVenta += valorVenta;

      return {
        producto_id: p.id,
        nombre: p.nombre,
        stock_actual: stock,
        unidad_medida: p.unidad_medida,
        costo_unitario: Number(costoUnitario.toFixed(2)),
        precio_venta: precioVenta,
        valor_costo: Number(valorCosto.toFixed(2)),
        valor_venta: Number(valorVenta.toFixed(2)),
        tiene_costo: mapaCostos.has(p.id),
      };
    });

    // Ordenar por valor de costo (los más valiosos primero)
    detalle.sort((a, b) => b.valor_costo - a.valor_costo);

    return {
      valor_total_costo: Number(valorTotalCosto.toFixed(2)),   // cuánto te costó tu stock
      valor_total_venta: Number(valorTotalVenta.toFixed(2)),   // cuánto vale a precio de venta
      utilidad_potencial: Number((valorTotalVenta - valorTotalCosto).toFixed(2)), // ganancia si vendes todo
      cantidad_productos: detalle.length,
      detalle,
    };
  }
  
}