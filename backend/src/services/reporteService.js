import { productoRepository } from "../repositories/productoRepository.js";
import { varianteRepository } from "../repositories/varianteRepository.js";
import { movimientoRepository } from "../repositories/movimientoRepository.js";

export const reporteService = {
  /**
   * Reporte general: cada producto activo con todas sus variantes y el
   * stock real de cada una. Es la "foto" completa del inventario.
   */
  async inventarioGeneral() {
    const [productos, variantes] = await Promise.all([
      productoRepository.listar({ activo: true }),
      varianteRepository.listarActivas(),
    ]);
    return productos.map((p) => ({
      ...p,
      variantes: variantes.filter((v) => v.productoId === p.id),
    }));
  },

  /**
   * Reporte de movimientos por rango de fechas (ambos límites opcionales,
   * formato "YYYY-MM-DD") y tipo opcional. "hasta" incluye el día completo.
   */
  async movimientos({ desde, hasta, tipo }) {
    const fechaDesde = desde ? new Date(`${desde}T00:00:00`) : null;
    const fechaHasta = hasta ? new Date(`${hasta}T23:59:59.999`) : null;

    let movimientos = await movimientoRepository.listarPorRango({
      desde: fechaDesde,
      hasta: fechaHasta,
    });

    if (tipo) movimientos = movimientos.filter((m) => m.tipo === tipo);
    return movimientos;
  },

  async stockBajo() {
    return varianteRepository.listarStockCritico(["BAJO"]);
  },

  async agotados() {
    return varianteRepository.listarStockCritico(["AGOTADO"]);
  },
};