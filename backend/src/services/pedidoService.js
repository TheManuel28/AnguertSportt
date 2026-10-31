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
const ROLES_PERSONAL = ["administrador", "almacenero"];
const MAX_PRODUCTOS_POR_PEDIDO = 30;
const MAX_CANTIDAD_POR_PRODUCTO = 50;
const MAX_OBSERVACION = 300;

/**
 * Valida lo que llega del navegador (que se puede manipular): cantidades enteras
 * y positivas, sin ids raros, y junta las líneas repetidas de una misma variante.
 */
function normalizarItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw errorHttp(400, "El pedido debe tener al menos un producto");
  }
  if (items.length > MAX_PRODUCTOS_POR_PEDIDO) {
    throw errorHttp(400, `Un pedido no puede tener más de ${MAX_PRODUCTOS_POR_PEDIDO} productos distintos`);
  }
  const porVariante = new Map();
  for (const item of items) {
    const varianteId = typeof item?.varianteId === "string" ? item.varianteId.trim() : "";
    if (!varianteId || varianteId.length > 100 || varianteId.includes("/")) {
      throw errorHttp(400, "Hay un producto inválido en el pedido");
    }
    const cantidad = item?.cantidad;
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > MAX_CANTIDAD_POR_PRODUCTO) {
      throw errorHttp(400, `La cantidad de cada producto debe ser un número entero entre 1 y ${MAX_CANTIDAD_POR_PRODUCTO}`);
    }
    porVariante.set(varianteId, (porVariante.get(varianteId) ?? 0) + cantidad);
  }
  return [...porVariante].map(([varianteId, cantidad]) => ({ varianteId, cantidad }));
}

export const pedidoService = {
  /**
   * Crea un pedido con el esquema de pago fraccionado 50/50 de Angher Sport.
   * items: [{ varianteId, cantidad }]
   * NO descuenta stock todavía: eso ocurre recién al confirmar el pago inicial,
   * para no reservar existencias de pedidos que nunca llegan a pagarse.
   */
  async crearPedido({ clienteId, clienteNombre, clienteEmail, items, observacion }) {
    const itemsValidos = normalizarItems(items);

    let total = 0;
    const detalle = [];

    for (const item of itemsValidos) {
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
      observacion: typeof observacion === "string" ? observacion.trim().slice(0, MAX_OBSERVACION) : "",
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
    /**
   * Comprobante de pedido (documento NO tributario). Lo ve el personal de la tienda
   * y el cliente dueño del pedido; para cualquier otro usuario el pedido "no existe".
   */
  async obtenerComprobante({ pedidoId, usuario, cliente }) {
    let pedido = await pedidoRepository.obtenerPorId(pedidoId);
    if (!pedido) throw errorHttp(404, "Pedido no encontrado");

    const esPersonal = ROLES_PERSONAL.includes(usuario?.rol);
    if (!esPersonal && (!cliente || pedido.clienteId !== cliente.id)) {
      throw errorHttp(404, "Pedido no encontrado");
    }
    if (pedido.estadoPago !== "PAGO_INICIAL_CONFIRMADO") {
      throw errorHttp(409, "El comprobante se emite cuando la tienda confirma el pago inicial");
    }
    if (!pedido.comprobante) {
      pedido = await pedidoRepository.emitirComprobanteSiFalta(pedidoId);
    }

    return {
      numero: pedido.comprobante.numero,
      emitidoEn: pedido.comprobante.emitidoEn,
      pedidoId: pedido.id,
      estadoPedido: pedido.estado,
      tienda: {
        nombre: process.env.TIENDA_NOMBRE || "Angher Sport",
        telefono: process.env.TIENDA_TELEFONO || null,
        direccion: process.env.TIENDA_DIRECCION || null,
      },
      cliente: { nombre: pedido.clienteNombre || "", email: pedido.clienteEmail || "" },
      items: pedido.items,
      total: pedido.total,
      pagoInicial: pedido.pagoInicial,
      pagoRestante: pedido.pagoRestante,
      pago: {
        metodo: pedido.metodoPago === "YAPE_MANUAL" ? "Yape" : "Pago en tienda",
        numeroOperacion: pedido.pagoYape?.numeroOperacion ?? null,
        confirmadoEn: pedido.pagoConfirmadoEn ?? null,
      },
      leyenda: "Documento no tributario. No es una boleta ni una factura electrónica.",
    };
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