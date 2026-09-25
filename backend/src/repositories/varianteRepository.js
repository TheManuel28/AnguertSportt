import { db } from "../config/firebase.js";

const coleccion = db.collection("variantes");

export const varianteRepository = {
  async crear(variante) {
    const ref = await coleccion.add(variante);
    return { id: ref.id, ...variante };
  },

  async obtenerPorId(id) {
    const doc = await coleccion.doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  },

  async listarPorProducto(productoId) {
  const snapshot = await coleccion
    .where("productoId", "==", productoId)
    .where("activo", "==", true)
    .get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
},

async desactivar(id) {
  await coleccion.doc(id).update({ activo: false, fechaActualizacion: new Date() });
},

  async listarStockCritico(estados = ["BAJO", "AGOTADO"]) {
    const snapshot = await coleccion.where("estadoStock", "in", estados).get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  },

  async listarActivas() {
    const snapshot = await coleccion.where("activo", "==", true).get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  },

  referencia(id) {
    return coleccion.doc(id);
  },
  
};
