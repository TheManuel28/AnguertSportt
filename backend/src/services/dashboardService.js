import { varianteRepository } from "../repositories/varianteRepository.js";
import { productoRepository } from "../repositories/productoRepository.js";
import { movimientoRepository } from "../repositories/movimientoRepository.js";

const DIAS_VENTANA = 30;
const TOP_N = 5;
const MAX_RECIENTES = 5;

function aFecha(valor) {
  // Los Timestamp de Firestore traen .toDate(); si ya es Date, se usa tal cual.
  return valor?.toDate ? valor.toDate() : new Date(valor);
}

function inicioDeDia(fecha) {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  return d;
}

export const dashboardService = {
  /**
   * Arma el resumen que consume el panel administrativo (Módulo 2):
   * totales por estado de stock, serie de movimientos de los últimos 30
   * días, top 5 productos con más salidas, movimientos recientes y alertas
   * activas. Todo se calcula en el backend a partir de datos reales de
   * Firestore, nada se inventa en el frontend.
   */
  async obtenerResumen() {
    const [productos, variantes] = await Promise.all([
      productoRepository.listar({ activo: true }),
      varianteRepository.listarActivas(),
    ]);

    const conteoPorEstado = { NORMAL: 0, BAJO: 0, AGOTADO: 0 };
    for (const variante of variantes) {
      conteoPorEstado[variante.estadoStock] = (conteoPorEstado[variante.estadoStock] || 0) + 1;
    }

    const fechaDesde = new Date();
    fechaDesde.setDate(fechaDesde.getDate() - DIAS_VENTANA);
    const movimientosRecientes = await movimientoRepository.listarDesde(fechaDesde);

    // Serie diaria entradas vs salidas, para el gráfico
    const seriePorDia = {};
    for (const movimiento of movimientosRecientes) {
      const clave = inicioDeDia(aFecha(movimiento.fecha)).toISOString().slice(0, 10);
      if (!seriePorDia[clave]) {
        seriePorDia[clave] = { fecha: clave, entradas: 0, salidas: 0 };
      }
      if (movimiento.tipo === "ENTRADA") seriePorDia[clave].entradas += movimiento.cantidad;
      if (movimiento.tipo === "SALIDA") seriePorDia[clave].salidas += movimiento.cantidad;
    }
    const serieMovimientos = Object.values(seriePorDia).sort((a, b) =>
      a.fecha.localeCompare(b.fecha)
    );

    // Top productos con más salidas en la ventana de 30 días
    const salidasPorProducto = {};
    for (const movimiento of movimientosRecientes) {
      if (movimiento.tipo !== "SALIDA") continue;
      salidasPorProducto[movimiento.productoNombre] =
        (salidasPorProducto[movimiento.productoNombre] || 0) + movimiento.cantidad;
    }
    const topSalidas = Object.entries(salidasPorProducto)
      .map(([productoNombre, cantidad]) => ({ productoNombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, TOP_N);

    const entradasRecientes = movimientosRecientes
      .filter((m) => m.tipo === "ENTRADA")
      .slice(0, MAX_RECIENTES);
    const salidasRecientes = movimientosRecientes
      .filter((m) => m.tipo === "SALIDA")
      .slice(0, MAX_RECIENTES);

    const alertasActivas = variantes
      .filter((v) => v.estadoStock !== "NORMAL")
      .sort((a, b) => a.stockActual - b.stockActual);

    return {
      totales: {
        productos: productos.length,
        variantes: variantes.length,
        stockNormal: conteoPorEstado.NORMAL,
        stockBajo: conteoPorEstado.BAJO,
        stockAgotado: conteoPorEstado.AGOTADO,
      },
      serieMovimientos,
      topSalidas,
      entradasRecientes,
      salidasRecientes,
      alertasActivas,
    };
  },
};
