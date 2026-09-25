import { categoriaRepository } from "../repositories/categoriaRepository.js";

export const categoriaService = {
  async crear({ nombre, descripcion }) {
    if (!nombre || !nombre.trim()) {
      const error = new Error("El nombre de la categoría es obligatorio");
      error.status = 400;
      throw error;
    }
    return categoriaRepository.crear({
      nombre: nombre.trim(),
      descripcion: descripcion || "",
      activo: true,
    });
  },

  async listar() {
    return categoriaRepository.listar({ activo: true });
  },
};