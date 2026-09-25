import { db } from "../config/firebase.js";

const coleccion = db.collection("clientes");

export const clienteRepository = {
  async crear(cliente) {
    const ref = await coleccion.add(cliente);
    return { id: ref.id, ...cliente };
  },

  async obtenerPorId(id) {
    const doc = await coleccion.doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  },

  async buscarPorUid(uid) {
    const snapshot = await coleccion.where("uid", "==", uid).limit(1).get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  },

  async listar() {
    const snapshot = await coleccion.get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  },
};
