import { pedidoRepository } from "../repositories/pedidoRepository.js";
import { varianteRepository } from "../repositories/varianteRepository.js";
import { inventarioService } from "./inventarioService.js";
import { productoRepository } from "../repositories/productoRepository.js";

const ESTADOS_PEDIDO = [
  "PENDIENTE_PAGO_INICIAL",
  "PAGO_EN_REVISION",
  "CONFIRMADO",
  "EN_PREPARACION",
  "LISTO_PARA_ENTREGA",
  "ENTREGADO",
  "CANCELADO",
];

// Estados que el administrador puede asignar a mano con el selector.
// El paso de "pendiente" a "confirmado" SOLO ocurre por confirmarPagoInicial,
// que es lo que descuenta el stock.
const ESTADOS_ASIGNABLES = ["CONFIRMADO", "EN_PREPARACION", "LISTO_PARA_ENTREGA", "ENTREGADO", "CANCELADO"];
const ESTADOS_SIN_PAGO = ["PENDIENTE_PAGO_INICIAL", "PAGO_EN_REVISION"];

// Número de operación que muestra Yape en el comprobante: solo dígitos.
const FORMATO_OPERACION = /^\d{6,12}$/;

function errorHttp(status, mensaje) {
  const error = new Error(mensaje);
  error.status = status;
  return error;
}

export const pedidoService = {
  /**
   * Crea un pedido con el esquema de pago fraccionado 50/50 de Angher Sport.
   * items: [{ varianteId, cantidad }]
   * NO descuenta stock todavía: eso ocurre recién al confirmar el pago inicial,
   * para no reservar existencias de pedidos que nunca llegan a pagarse.
   */
  async crearPedido({ clienteId, clienteNombre, clienteEmail, items, observacion }) {
    if (!items || items.length === 0) {
      throw errorHttp(400, "El pedido debe tener al menos un producto");
    }

    let total = 0;
    const detalle = [];

    for (const item of items) {
      const variante = await varianteRepository.obtenerPorId(item.varianteId);
      if (!variante) {
        throw errorHttp(404, `La variante ${item.varianteId} no existe`);
      }
      if (variante.stockActual < item.cantidad) {
        throw errorHttp(
          400,
          `Stock insuficiente para ${variante.productoNombre} (${variante.talla}/${variante.color})`
        );
      }

      const producto = await productoRepository.obtenerPorId(variante.productoId);
      if (!producto) {
        throw errorHttp(404, `El producto de la variante ${item.varianteId} no existe`);
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

  /** Datos de Yape de la tienda que ve el cliente al pagar (se configuran en variables de entorno). */
  yapeConfig() {
    return {
      numero: process.env.YAPE_NUMERO || null,
      titular: process.env.YAPE_TITULAR || null,
    };
  },

  /**
   * El cliente informa su número de operación de Yape. El monto NO viene del
   * navegador: se toma del pedido (pagoInicial), calculado en el servidor.
   */
  async reportarPagoYape({ pedidoId, clienteId, numeroOperacion }) {
    const numero = String(numeroOperacion ?? "").replace(/\s+/g, "");
    if (!FORMATO_OPERACION.test(numero)) {
      throw errorHttp(
        400,
        "El número de operación debe tener solo dígitos (entre 6 y 12). Lo ves en el comprobante de Yape."
      );
    }
    return pedidoRepository.reportarPagoYape({ pedidoId, clienteId, numeroOperacion: numero });
  },

  async rechazarPago(pedidoId, motivo, usuario) {
    const texto = String(motivo ?? "").trim().slice(0, 200);
    if (texto.length < 3) {
      throw errorHttp(400, "Indica el motivo del rechazo para que el cliente sepa qué corregir");
    }
    return pedidoRepository.rechazarPago({
      id: pedidoId,
      motivo: texto,
      nombreUsuario: usuario?.nombre || usuario?.email || usuario?.uid || "administrador",
    });
  },

  /**
   * Confirma el pago inicial (50%) del pedido y recién aquí descuenta el stock.
   *
   * Orden pensado para que sea seguro aunque se pulse dos veces o dos
   * administradores actúen a la vez:
   *  1) se verifica el stock de TODOS los ítems antes de tocar nada;
   *  2) se "reclama" el pedido de forma atómica (solo una llamada lo logra);
   *  3) se descuenta el stock; si algo falla, el pedido vuelve a su estado anterior.
   */
  async confirmarPagoInicial(pedidoId, usuario) {
    const pedido = await pedidoRepository.obtenerPorId(pedidoId);
    if (!pedido) throw errorHttp(404, "Pedido no encontrado");

    if (!ESTADOS_SIN_PAGO.includes(pedido.estado)) {
      throw errorHttp(409, "Este pedido ya fue procesado o no está pendiente de pago");
    }

    for (const item of pedido.items) {
      const variante = await varianteRepository.obtenerPorId(item.varianteId);
      if (!variante || variante.stockActual < item.cantidad) {
        throw errorHttp(
          400,
          `Stock insuficiente para ${item.productoNombre} (${item.talla}/${item.color}): no se puede confirmar el pedido`
        );
      }
    }

    const { estadoAnterior } = await pedidoRepository.reclamarConfirmacion(pedidoId, ESTADOS_SIN_PAGO);

    try {
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
    } catch (error) {
      await pedidoRepository.revertirReclamo(pedidoId, estadoAnterior);
      throw error;
    }

    await pedidoRepository.marcarPagoConfirmado(
      pedidoId,
      usuario?.nombre || usuario?.email || usuario?.uid || "administrador"
    );
    return pedidoRepository.obtenerPorId(pedidoId);
  },

  async cambiarEstado(pedidoId, nuevoEstado) {
    if (!ESTADOS_ASIGNABLES.includes(nuevoEstado)) {
      throw errorHttp(400, "Estado de pedido inválido");
    }
    const pedido = await pedidoRepository.obtenerPorId(pedidoId);
    if (!pedido) throw errorHttp(404, "Pedido no encontrado");

    if (pedido.estado === "CANCELADO") {
      throw errorHttp(409, "Un pedido cancelado no puede cambiar de estado");
    }
    if (nuevoEstado === "CANCELADO") {
      return pedidoRepository.cancelarPedido(pedidoId);
    }
    if (ESTADOS_SIN_PAGO.includes(pedido.estado)) {
      throw errorHttp(409, "Primero confirma el pago inicial del pedido");
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

export { ESTADOS_PEDIDO };