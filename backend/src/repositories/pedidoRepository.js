import { db } from "../config/firebase.js";

const coleccion = db.collection("pedidos");
// Una operación de Yape = un documento cuyo ID es el número de operación.
// Como Firestore no permite dos documentos con el mismo ID, es imposible
// registrar el mismo comprobante en dos pedidos distintos.
const operaciones = db.collection("operacionesYape");
// Contador para numerar los comprobantes de pedido de forma correlativa.
const contadores = db.collection("contadores");
const ID_CONTADOR_COMPROBANTES = "comprobantes";
const formatearNumeroComprobante = (n) => `AS-${String(n).padStart(6, "0")}`;

/**
 * Asigna el siguiente número de comprobante al pedido (si todavía no tiene).
 * Debe llamarse dentro de una transacción, DESPUÉS de haber leído el pedido y el contador.
 */
function numerarComprobante(tx, pedido, contadorRef, contadorSnap) {
  if (pedido.comprobante) return {};
  const siguiente = (contadorSnap.exists ? contadorSnap.data().ultimo : 0) + 1;
  if (contadorSnap.exists) tx.update(contadorRef, { ultimo: siguiente });
  else tx.set(contadorRef, { ultimo: siguiente });
  return { comprobante: { numero: formatearNumeroComprobante(siguiente), emitidoEn: new Date() } };
}

function errorHttp(status, mensaje) {
  const error = new Error(mensaje);
  error.status = status;
  return error;
}

export const pedidoRepository = {
  async crear(pedido) {
    const ref = await coleccion.add(pedido);
    return { id: ref.id, ...pedido };
  },

  async obtenerPorId(id) {
    const doc = await coleccion.doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  },

  async listarPorCliente(clienteId) {
    const snapshot = await coleccion.where("clienteId", "==", clienteId).get();
    const pedidos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return pedidos.sort((a, b) => {
      const fa = a.fechaCreacion?._seconds ?? 0;
      const fb = b.fechaCreacion?._seconds ?? 0;
      return fb - fa;
    });
  },

  async listarPorEstado(estado) {
    const snapshot = await coleccion.where("estado", "==", estado).get();
    const pedidos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return pedidos.sort((a, b) => (b.fechaCreacion?._seconds ?? 0) - (a.fechaCreacion?._seconds ?? 0));
  },

  async listarTodos() {
    const snapshot = await coleccion.orderBy("fechaCreacion", "desc").get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  },

  async actualizarEstado(id, estado) {
    await coleccion.doc(id).update({ estado, fechaActualizacion: new Date() });
  },

  /**
   * El cliente informa que pagó por Yape. En UNA transacción: verifica que el
   * pedido sea suyo y siga pendiente, reserva el número de operación (falla si
   * ya fue usado) y pasa el pedido a PAGO_EN_REVISION.
   */
  async reportarPagoYape({ pedidoId, clienteId, numeroOperacion }) {
    return db.runTransaction(async (tx) => {
      const pedidoRef = coleccion.doc(pedidoId);
      const operacionRef = operaciones.doc(numeroOperacion);
      const pedidoSnap = await tx.get(pedidoRef);
      const operacionSnap = await tx.get(operacionRef);

      if (!pedidoSnap.exists) throw errorHttp(404, "Pedido no encontrado");
      const pedido = pedidoSnap.data();

      if (pedido.clienteId !== clienteId) throw errorHttp(403, "Este pedido no te pertenece");
      if (pedido.estado === "PAGO_EN_REVISION") {
        throw errorHttp(409, "Ya enviaste tu pago y está en revisión");
      }
      if (pedido.estado !== "PENDIENTE_PAGO_INICIAL") {
        throw errorHttp(409, "Este pedido ya no está pendiente de pago");
      }
      if (operacionSnap.exists) {
        throw errorHttp(409, "Ese número de operación ya fue usado en otro pedido");
      }

      const cambios = {
        estado: "PAGO_EN_REVISION",
        estadoPago: "PAGO_EN_REVISION",
        metodoPago: "YAPE_MANUAL",
        pagoYape: {
          numeroOperacion,
          montoEsperado: pedido.pagoInicial,
          reportadoEn: new Date(),
        },
        fechaActualizacion: new Date(),
      };

      tx.create(operacionRef, { pedidoId, clienteId, fecha: new Date() });
      tx.update(pedidoRef, cambios);
      return { id: pedidoId, ...pedido, ...cambios };
    });
  },

  /**
   * Paso 1 de la confirmación: "reclama" el pedido de forma atómica. Si dos
   * administradores pulsan a la vez (o se hace doble clic), solo uno lo logra;
   * el otro recibe un error 409 y el stock no se descuenta dos veces.
   */
  async reclamarConfirmacion(id, estadosPermitidos) {
    return db.runTransaction(async (tx) => {
      const ref = coleccion.doc(id);
      const snap = await tx.get(ref);
      if (!snap.exists) throw errorHttp(404, "Pedido no encontrado");
      const pedido = snap.data();

      if (!estadosPermitidos.includes(pedido.estado)) {
        throw errorHttp(409, "Este pedido ya fue procesado o no está pendiente de pago");
      }
      tx.update(ref, { estado: "CONFIRMADO", stockDescontado: false, fechaActualizacion: new Date() });
      return { estadoAnterior: pedido.estado };
    });
  },

  async revertirReclamo(id, estadoAnterior) {
    await coleccion.doc(id).update({
      estado: estadoAnterior,
      stockDescontado: false,
      fechaActualizacion: new Date(),
    });
  },

    /**
   * Cierra la confirmación: marca el pago como confirmado y EMITE el comprobante
   * de pedido con su número correlativo, todo en una transacción (el número nunca
   * se repite ni se salta aunque se confirmen pedidos a la vez).
   */
  async marcarPagoConfirmado(id, nombreUsuario) {
    return db.runTransaction(async (tx) => {
      const ref = coleccion.doc(id);
      const contadorRef = contadores.doc(ID_CONTADOR_COMPROBANTES);
      const snap = await tx.get(ref);
      const contadorSnap = await tx.get(contadorRef);
      if (!snap.exists) throw errorHttp(404, "Pedido no encontrado");
      const pedido = snap.data();

      const cambios = {
        stockDescontado: true,
        estadoPago: "PAGO_INICIAL_CONFIRMADO",
        pagoConfirmadoPor: nombreUsuario,
        pagoConfirmadoEn: new Date(),
        pagoRechazo: null,
        fechaActualizacion: new Date(),
        ...numerarComprobante(tx, pedido, contadorRef, contadorSnap),
      };
      tx.update(ref, cambios);
    });
  },

  /**
   * Garantiza que un pedido con pago confirmado tenga comprobante. Sirve para los
   * pedidos confirmados ANTES de existir esta función: se numera la primera vez
   * que alguien lo pide, una sola vez.
   */
  async emitirComprobanteSiFalta(id) {
    return db.runTransaction(async (tx) => {
      const ref = coleccion.doc(id);
      const contadorRef = contadores.doc(ID_CONTADOR_COMPROBANTES);
      const snap = await tx.get(ref);
      const contadorSnap = await tx.get(contadorRef);
      if (!snap.exists) throw errorHttp(404, "Pedido no encontrado");
      const pedido = snap.data();

      if (pedido.estadoPago !== "PAGO_INICIAL_CONFIRMADO") {
        throw errorHttp(409, "El comprobante se emite cuando la tienda confirma el pago inicial");
      }
      const cambios = numerarComprobante(tx, pedido, contadorRef, contadorSnap);
      if (cambios.comprobante) tx.update(ref, cambios);
      return { id, ...pedido, ...cambios };
    });
  },

  /**
   * El administrador no encuentra el pago en su Yape: el pedido vuelve a
   * pendiente (con el motivo visible para el cliente) y el número de operación
   * se libera por si el cliente lo corrige o es el comprobante de otra persona.
   */
  async rechazarPago({ id, motivo, nombreUsuario }) {
    return db.runTransaction(async (tx) => {
      const ref = coleccion.doc(id);
      const snap = await tx.get(ref);
      if (!snap.exists) throw errorHttp(404, "Pedido no encontrado");
      const pedido = snap.data();

      if (pedido.estado !== "PAGO_EN_REVISION") {
        throw errorHttp(409, "Solo se puede rechazar un pago que está en revisión");
      }
      const numero = pedido.pagoYape?.numeroOperacion;

      const cambios = {
        estado: "PENDIENTE_PAGO_INICIAL",
        estadoPago: "PENDIENTE_PAGO_INICIAL",
        pagoYape: null,
        pagoRechazo: { motivo, numeroOperacion: numero ?? null, rechazadoPor: nombreUsuario, fecha: new Date() },
        intentosPago: (pedido.intentosPago ?? 0) + 1,
        fechaActualizacion: new Date(),
      };
      if (numero) tx.delete(operaciones.doc(numero));
      tx.update(ref, cambios);
      return { id, ...pedido, ...cambios };
    });
  },

  /** Cancela un pedido; si estaba en revisión libera el número de operación reservado. */
  async cancelarPedido(id) {
    return db.runTransaction(async (tx) => {
      const ref = coleccion.doc(id);
      const snap = await tx.get(ref);
      if (!snap.exists) throw errorHttp(404, "Pedido no encontrado");
      const pedido = snap.data();

      if (pedido.estado === "CANCELADO") throw errorHttp(409, "El pedido ya está cancelado");
      const numero = pedido.estado === "PAGO_EN_REVISION" ? pedido.pagoYape?.numeroOperacion : null;

      const cambios = { estado: "CANCELADO", fechaActualizacion: new Date() };
      if (numero) tx.delete(operaciones.doc(numero));
      tx.update(ref, cambios);
      return { id, ...pedido, ...cambios };
    });
  },

  referencia(id) {
    return coleccion.doc(id);
  },
};
