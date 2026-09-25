import { productoRepository } from "../repositories/productoRepository.js";
import { varianteRepository } from "../repositories/varianteRepository.js";

export const productoService = {
  async crearProducto(datos) {
    const producto = {
      codigo: datos.codigo,
      nombre: datos.nombre,
      categoriaId: datos.categoriaId,
      categoriaNombre: datos.categoriaNombre,
      descripcion: datos.descripcion || "",
      precioVenta: datos.precioVenta,
      imagenUrl: datos.imagenUrl || "",
      tieneVariantes: datos.tieneVariantes ?? true,
      stockTotal: 0,
      activo: true,
      fechaCreacion: new Date(),
      fechaActualizacion: new Date(),
    };
    return productoRepository.crear(producto);
  },

  async agregarVariante(productoId, datos) {
    const producto = await productoRepository.obtenerPorId(productoId);
    if (!producto) {
      const error = new Error("Producto no encontrado");
      error.status = 404;
      throw error;
    }

    const stockInicial = datos.stockInicial ?? 0;
    const stockMinimo = datos.stockMinimo ?? 5;

    const variante = {
      productoId,
      productoNombre: producto.nombre,
      codigoSku: datos.codigoSku,
      talla: datos.talla,
      color: datos.color,
      stockActual: stockInicial,
      stockMinimo,
      estadoStock: stockInicial <= 0 ? "AGOTADO" : stockInicial <= stockMinimo ? "BAJO" : "NORMAL",
      activo: true,
      fechaActualizacion: new Date(),
    };
    const varianteCreada = await varianteRepository.crear(variante);

    await productoRepository.actualizar(productoId, {
      stockTotal: (producto.stockTotal ?? 0) + stockInicial,
    });

    return varianteCreada;
  },

  async listarCatalogo(filtros) {
    return productoRepository.listar(filtros);
  },

  async obtenerConVariantes(productoId) {
    const producto = await productoRepository.obtenerPorId(productoId);
    if (!producto) return null;
    const variantes = await varianteRepository.listarPorProducto(productoId);
    return { ...producto, variantes };
  },

  async actualizarImagen(productoId, imagenUrl) {
  const producto = await productoRepository.obtenerPorId(productoId);
  if (!producto) {
    const error = new Error("Producto no encontrado");
    error.status = 404;
    throw error;
  }
  return productoRepository.actualizar(productoId, { imagenUrl: imagenUrl || "" });
},
async eliminarVariante(productoId, varianteId) {
  const producto = await productoRepository.obtenerPorId(productoId);
  if (!producto) {
    const error = new Error("Producto no encontrado");
    error.status = 404;
    throw error;
  }
  const variante = await varianteRepository.obtenerPorId(varianteId);
  if (!variante || variante.productoId !== productoId) {
    const error = new Error("Variante no encontrada");
    error.status = 404;
    throw error;
  }

  await varianteRepository.desactivar(varianteId);

  await productoRepository.actualizar(productoId, {
    stockTotal: Math.max(0, (producto.stockTotal ?? 0) - (variante.stockActual ?? 0)),
  });
},
};
