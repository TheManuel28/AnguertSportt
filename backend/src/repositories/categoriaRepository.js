import { db } from "../config/firebase.js";

const coleccion = db.collection("categorias");

export const categoriaRepository = {
  async crear(categoria) {
    const ref = await coleccion.add(categoria);
    return { id: ref.id, ...categoria };
  },

  async listar({ activo = true } = {}) {
    let query = coleccion;
    if (activo !== undefined) query = query.where("activo", "==", activo);
    const snapshot = await query.get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  },
};