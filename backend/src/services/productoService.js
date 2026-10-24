import { db } from "../config/firebase.js";
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
    const stockInicial = datos.stockInicial ?? 0;
    const stockMinimo = datos.stockMinimo ?? 5;
    const varianteRef = db.collection("variantes").doc();
    const productoRef = productoRepository.referencia(productoId);

    return db.runTransaction(async (tx) => {
      const productoSnap = await tx.get(productoRef);
      if (!productoSnap.exists) {
        const error = new Error("Producto no encontrado");
        error.status = 404;
        throw error;
      }

      const variantesSnap = await tx.get(
        db.collection("variantes").where("productoId", "==", productoId)
      );
      const stockExistente = variantesSnap.docs.reduce((total, doc) => {
        const variante = doc.data();
        const stock = Number(variante.stockActual ?? 0);
        return variante.activo === true && Number.isFinite(stock) ? total + stock : total;
      }, 0);
      const producto = productoSnap.data();
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

      tx.create(varianteRef, variante);
      tx.update(productoRef, {
        stockTotal: stockExistente + stockInicial,
        fechaActualizacion: new Date(),
      });

      return { id: varianteRef.id, ...variante };
    });
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
  const productoRef = productoRepository.referencia(productoId);
  const varianteRef = varianteRepository.referencia(varianteId);

  await db.runTransaction(async (tx) => {
    const productoSnap = await tx.get(productoRef);
    const varianteSnap = await tx.get(varianteRef);
    if (!productoSnap.exists) {
      const error = new Error("Producto no encontrado");
      error.status = 404;
      throw error;
    }
    if (!varianteSnap.exists || varianteSnap.data().productoId !== productoId) {
      const error = new Error("Variante no encontrada");
      error.status = 404;
      throw error;
    }

    const variantesSnap = await tx.get(
      db.collection("variantes").where("productoId", "==", productoId)
    );
    const stockTotalCalculado = variantesSnap.docs.reduce((total, doc) => {
      const variante = doc.data();
      if (doc.id === varianteId || variante.activo !== true) return total;
      const stock = Number(variante.stockActual ?? 0);
      return Number.isFinite(stock) ? total + stock : total;
    }, 0);

    tx.update(varianteRef, { activo: false, fechaActualizacion: new Date() });
    tx.update(productoRef, {
      stockTotal: stockTotalCalculado,
      fechaActualizacion: new Date(),
    });
  });
},
};
