import { db } from "../config/firebase.js";
import { varianteRepository } from "../repositories/varianteRepository.js";
import { movimientoRepository } from "../repositories/movimientoRepository.js";
import { productoRepository } from "../repositories/productoRepository.js";

const TIPOS_VALIDOS = ["ENTRADA", "SALIDA", "AJUSTE"];

function calcularEstadoStock(stockActual, stockMinimo) {
  if (stockActual <= 0) return "AGOTADO";
  if (stockActual <= stockMinimo) return "BAJO";
  return "NORMAL";
}

export const inventarioService = {
  /**
   * Registra un movimiento de inventario (ENTRADA, SALIDA o AJUSTE) de forma
   * atómica: crea el movimiento, actualiza el stock de la variante y el
   * stockTotal del producto en una sola transacción de Firestore.
   *
   * El total del producto se recalcula desde sus variantes activas dentro de
   * la misma transacción. Así también se corrigen inconsistencias antiguas
   * cuando se registra el siguiente movimiento.
   *
   * IMPORTANTE: todas las lecturas (tx.get) deben ocurrir ANTES que cualquier
   * escritura (tx.set/tx.update).
   */
  async registrarMovimiento({ tipo, varianteId, cantidad, motivo, observacion, usuario }) {
    if (!TIPOS_VALIDOS.includes(tipo)) {
      const error = new Error(`Tipo de movimiento inválido: ${tipo}`);
      error.status = 400;
      throw error;
    }
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      const error = new Error("La cantidad debe ser un número positivo");
      error.status = 400;
      throw error;
    }

    return db.runTransaction(async (tx) => {
      // 1) LECTURAS (deben ir todas antes de cualquier escritura)
      const varianteRef = varianteRepository.referencia(varianteId);
      const varianteSnap = await tx.get(varianteRef);

      if (!varianteSnap.exists) {
        const error = new Error("La variante no existe");
        error.status = 404;
        throw error;
      }
      const variante = varianteSnap.data();

      const productoRef = productoRepository.referencia(variante.productoId);
      const productoSnap = await tx.get(productoRef);
      if (!productoSnap.exists) {
        const error = new Error("El producto asociado a la variante no existe");
        error.status = 404;
        throw error;
      }
      // Leer todas las variantes del producto en la transacción para no
      // depender de un stockTotal que pudo haber quedado desactualizado.
      const variantesQuery = db.collection("variantes").where("productoId", "==", variante.productoId);
      const variantesSnap = await tx.get(variantesQuery);

      // 2) CÁLCULO
      const stockAnterior = variante.stockActual;
      let stockResultante;

      if (tipo === "ENTRADA") {
        stockResultante = stockAnterior + cantidad;
      } else if (tipo === "SALIDA") {
        if (cantidad > stockAnterior) {
          const error = new Error(
            `Stock insuficiente: hay ${stockAnterior} y se intenta retirar ${cantidad}`
          );
          error.status = 400;
          throw error;
        }
        stockResultante = stockAnterior - cantidad;
      } else {
        // AJUSTE: "cantidad" representa el nuevo stock real, contado físicamente
        stockResultante = cantidad;
      }

      const estadoStock = calcularEstadoStock(stockResultante, variante.stockMinimo ?? 0);
      const stockTotalCalculado = variantesSnap.docs.reduce((total, doc) => {
        const datos = doc.data();
        if (datos.activo !== true) return total;
        const stock = doc.id === varianteId ? stockResultante : Number(datos.stockActual ?? 0);
        return total + (Number.isFinite(stock) ? stock : 0);
      }, 0);

      // 3) ESCRITURAS
      tx.update(varianteRef, {
        stockActual: stockResultante,
        estadoStock,
        fechaActualizacion: new Date(),
      });

      tx.update(productoRef, {
        stockTotal: stockTotalCalculado,
        fechaActualizacion: new Date(),
      });

      const movimientoRef = movimientoRepository.referenciaNueva();
      const movimiento = {
        tipo,
        varianteId,
        productoId: variante.productoId,
        codigoSku: variante.codigoSku,
        productoNombre: variante.productoNombre,
        talla: variante.talla,
        color: variante.color,
        cantidad,
        stockAnterior,
        stockResultante,
        motivo,
        observacion: observacion || "",
        usuarioId: usuario.uid,
        usuarioNombre: usuario.nombre || usuario.email,
        fecha: new Date(),
        movimientoRevertidoId: null,
      };
      tx.set(movimientoRef, movimiento);

      return { id: movimientoRef.id, ...movimiento };
    });
  },

  async listarStockCritico() {
    return varianteRepository.listarStockCritico();
  },
  
  async listarVariantes() {
  return varianteRepository.listarActivas();
},

  async historial(filtros) {
    return movimientoRepository.listar(filtros);
  },
};

