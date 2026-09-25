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
   * IMPORTANTE sobre transacciones en Firestore: todas las lecturas (tx.get)
   * deben ocurrir ANTES que cualquier escritura (tx.set/tx.update). Por eso
   * aquí se leen variante y producto primero, y recién después se escribe.
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
      const producto = productoSnap.data();

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
      const delta = stockResultante - stockAnterior;

      // 3) ESCRITURAS
      tx.update(varianteRef, {
        stockActual: stockResultante,
        estadoStock,
        fechaActualizacion: new Date(),
      });

      tx.update(productoRef, {
        stockTotal: (producto.stockTotal ?? 0) + delta,
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
