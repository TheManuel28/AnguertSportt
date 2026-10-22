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

  referencia(id) {
    return coleccion.doc(id);
  },
};
