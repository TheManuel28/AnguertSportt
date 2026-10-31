import { clienteRepository } from "../repositories/clienteRepository.js";

function errorHttp(status, mensaje) {
  const error = new Error(mensaje);
  error.status = status;
  return error;
}

export const clienteService = {
  async registrar({ uid, nombre, email, telefono }) {
    const existente = await clienteRepository.buscarPorUid(uid);
    if (existente) return existente;

    const nombreLimpio = typeof nombre === "string" ? nombre.trim().replace(/\s+/g, " ") : "";
    if (nombreLimpio.length < 2 || nombreLimpio.length > 80) {
      throw errorHttp(400, "Escribe tu nombre (entre 2 y 80 caracteres)");
    }

    let telefonoLimpio = "";
    if (telefono !== undefined && telefono !== null && telefono !== "") {
      telefonoLimpio = typeof telefono === "string" ? telefono.trim() : "";
      if (!/^[0-9+\-\s()]{6,20}$/.test(telefonoLimpio)) {
        throw errorHttp(400, "El teléfono solo puede tener números, espacios y los signos + - ( )");
      }
    }

    return clienteRepository.crear({
      uid,
      nombre: nombreLimpio,
      email,
      telefono: telefonoLimpio,
      fechaRegistro: new Date(),
    });
  },

  async obtenerPorUid(uid) {
    return clienteRepository.buscarPorUid(uid);
  },
};
