import { db } from "../config/firebase.js";

const coleccion = db.collection("movimientos");

export const movimientoRepository = {
  async listar({ varianteId, tipo, limite = 50 } = {}) {
    let query = coleccion.orderBy("fecha", "desc").limit(limite);
    if (varianteId) query = query.where("varianteId", "==", varianteId);
    if (tipo) query = query.where("tipo", "==", tipo);
    const snapshot = await query.get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  },

  referenciaNueva() {
    return coleccion.doc();
  },

  /**
   * Trae todos los movimientos desde una fecha en adelante, del más
   * reciente al más antiguo. Usado por el dashboard para armar la serie de
   * los últimos 30 días y el top de productos más movidos.
   */
  async listarDesde(fechaDesde) {
    const snapshot = await coleccion
      .where("fecha", ">=", fechaDesde)
      .orderBy("fecha", "desc")
      .get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  },

  /**
   * Trae movimientos dentro de un rango de fechas (ambos límites
   * opcionales), sin límite de cantidad — usado por los reportes
   * exportables, a diferencia de listar() que sí limita a 50 para la
   * pantalla de historial del día a día.
   */
  async listarPorRango({ desde, hasta } = {}) {
    let query = coleccion;
    if (desde) query = query.where("fecha", ">=", desde);
    if (hasta) query = query.where("fecha", "<=", hasta);
    query = query.orderBy("fecha", "desc");
    const snapshot = await query.get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  },
};