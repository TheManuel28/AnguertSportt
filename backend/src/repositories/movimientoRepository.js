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
};
