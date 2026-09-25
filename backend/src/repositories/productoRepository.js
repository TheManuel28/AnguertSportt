import { db } from "../config/firebase.js";

const coleccion = db.collection("productos");

export const productoRepository = {
  async crear(producto) {
    const ref = await coleccion.add(producto);
    return { id: ref.id, ...producto };
  },

  async obtenerPorId(id) {
    const doc = await coleccion.doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  },

  referencia(id) {
    return coleccion.doc(id);
  },

  async listar({ categoriaId, activo = true } = {}) {
    let query = coleccion;
    if (activo !== undefined) query = query.where("activo", "==", activo);
    if (categoriaId) query = query.where("categoriaId", "==", categoriaId);
    const snapshot = await query.get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  },

  async actualizar(id, cambios) {
    await coleccion.doc(id).update(cambios);
    return this.obtenerPorId(id);
  },

  async desactivar(id) {
    await coleccion.doc(id).update({ activo: false });
  },
};
