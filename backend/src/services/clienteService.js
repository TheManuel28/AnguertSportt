import { clienteRepository } from "../repositories/clienteRepository.js";

export const clienteService = {
  async registrar({ uid, nombre, email, telefono }) {
    const existente = await clienteRepository.buscarPorUid(uid);
    if (existente) return existente;

    return clienteRepository.crear({
      uid,
      nombre,
      email,
      telefono: telefono || "",
      fechaRegistro: new Date(),
    });
  },

  async obtenerPorUid(uid) {
    return clienteRepository.buscarPorUid(uid);
  },
};
