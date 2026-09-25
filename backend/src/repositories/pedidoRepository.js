import { db } from "../config/firebase.js";

const coleccion = db.collection("pedidos");

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
    const snapshot = await coleccion
      .where("clienteId", "==", clienteId)
      .orderBy("fechaCreacion", "desc")
      .get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  },

 async listarPorEstado(estado) {
  const snapshot = await coleccion
    .where("estado", "==", estado)
    .orderBy("fechaCreacion", "desc")
    .get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
},

async listarTodos() {
  const snapshot = await coleccion.orderBy("fechaCreacion", "desc").get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
},

  async actualizarEstado(id, estado) {
    await coleccion.doc(id).update({ estado, fechaActualizacion: new Date() });
  },

  referencia(id) {
    return coleccion.doc(id);
  },
};
