import { pedidoRepository } from "../repositories/pedidoRepository.js";
import { varianteRepository } from "../repositories/varianteRepository.js";
import { inventarioService } from "./inventarioService.js";
import { productoRepository } from "../repositories/productoRepository.js";

const ESTADOS_PEDIDO = [
  "PENDIENTE_PAGO_INICIAL",
  "CONFIRMADO",
  "EN_PREPARACION",
  "LISTO_PARA_ENTREGA",
  "ENTREGADO",
  "CANCELADO",
];

export const pedidoService = {
  /**
   * Crea un pedido con el esquema de pago fraccionado 50/50 de Angher Sport.
   * items: [{ varianteId, cantidad }]
   * NO descuenta stock todavía: eso ocurre recién al confirmar el pago inicial,
   * para no reservar existencias de pedidos que nunca llegan a pagarse.
   */
  async crearPedido({ clienteId, clienteNombre, clienteEmail, items, observacion }) {
    if (!items || items.length === 0) {
      const error = new Error("El pedido debe tener al menos un producto");
      error.status = 400;
      throw error;
    }

    let total = 0;
    const detalle = [];

    for (const item of items) {
  const variante = await varianteRepository.obtenerPorId(item.varianteId);
  if (!variante) {
    const error = new Error(`La variante ${item.varianteId} no existe`);
    error.status = 404;
    throw error;
  }
  if (variante.stockActual < item.cantidad) {
    const error = new Error(
      `Stock insuficiente para ${variante.productoNombre} (${variante.talla}/${variante.color})`
    );
    error.status = 400;
    throw error;
  }

  const producto = await productoRepository.obtenerPorId(variante.productoId);
  if (!producto) {
    const error = new Error(`El producto de la variante ${item.varianteId} no existe`);
    error.status = 404;
    throw error;
  }

  const precioUnitario = producto.precioVenta;
  const subtotal = precioUnitario * item.cantidad;
  total += subtotal;
  detalle.push({
    varianteId: variante.id,
    productoNombre: variante.productoNombre,
    talla: variante.talla,
    color: variante.color,
    cantidad: item.cantidad,
    precioUnitario,
    subtotal,
  });
}

    const pagoInicial = Math.round(total * 0.5 * 100) / 100;
    const pagoRestante = total - pagoInicial;

    const pedido = {
      clienteId,
      clienteNombre: clienteNombre || "",
      clienteEmail: clienteEmail || "",
      items: detalle,
      total,
      pagoInicial,
      pagoRestante,
      estadoPago: "PENDIENTE_PAGO_INICIAL",
      estado: "PENDIENTE_PAGO_INICIAL",
      observacion: observacion || "",
      fechaCreacion: new Date(),
      fechaActualizacion: new Date(),
    };

    return pedidoRepository.crear(pedido);
  },

  /**
   * Confirma el pago inicial (50%) del pedido. Recién aquí se descuenta el
   * stock, uno por cada ítem del pedido (cada uno en su propia transacción
   * atómica de inventarioService). Para pedidos con muchos ítems y necesidad
   * de "todo o nada", se puede evolucionar a una única transacción conjunta.
   */
  async confirmarPagoInicial(pedidoId, usuario) {
    const pedido = await pedidoRepository.obtenerPorId(pedidoId);
    if (!pedido) {
      const error = new Error("Pedido no encontrado");
      error.status = 404;
      throw error;
    }

    for (const item of pedido.items) {
      await inventarioService.registrarMovimiento({
        tipo: "SALIDA",
        varianteId: item.varianteId,
        cantidad: item.cantidad,
        motivo: "VENTA",
        observacion: `Pedido ${pedidoId}`,
        usuario,
      });
    }

    await pedidoRepository.actualizarEstado(pedidoId, "CONFIRMADO");
    return pedidoRepository.obtenerPorId(pedidoId);
  },

  async cambiarEstado(pedidoId, nuevoEstado) {
    if (!ESTADOS_PEDIDO.includes(nuevoEstado)) {
      const error = new Error("Estado de pedido inválido");
      error.status = 400;
      throw error;
    }
    await pedidoRepository.actualizarEstado(pedidoId, nuevoEstado);
    return pedidoRepository.obtenerPorId(pedidoId);
  },

  async listarPorCliente(clienteId) {
    return pedidoRepository.listarPorCliente(clienteId);
  },
  
  async listarTodos({ estado } = {}) {
  if (estado) return pedidoRepository.listarPorEstado(estado);
  return pedidoRepository.listarTodos();
},
};
