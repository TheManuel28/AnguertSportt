import { Router } from "express";
import { verificarToken, permitirRoles } from "../middleware/auth.js";
import { pedidoService } from "../services/pedidoService.js";
import { clienteService } from "../services/clienteService.js";

const router = Router();

// El cliente autenticado crea su propio pedido
router.post("/", verificarToken, async (req, res, next) => {
  try {
    const cliente = await clienteService.obtenerPorUid(req.usuario.uid);
    if (!cliente) {
      return res.status(400).json({ error: "Debes completar tu registro de cliente primero" });
    }
    const pedido = await pedidoService.crearPedido({
      clienteId: cliente.id,
      clienteNombre: cliente.nombre,
      clienteEmail: cliente.email,
      items: req.body.items,
      observacion: req.body.observacion,
    });
    res.status(201).json(pedido);
  } catch (error) {
    next(error);
  }
});

// Datos de Yape de la tienda (solo para usuarios con sesión iniciada)
router.get("/yape-config", verificarToken, (req, res) => {
  res.json(pedidoService.yapeConfig());
});

// El cliente autenticado ve sus propios pedidos
router.get("/mis-pedidos", verificarToken, async (req, res, next) => {
  try {
    const cliente = await clienteService.obtenerPorUid(req.usuario.uid);
    if (!cliente) {
      return res.json([]);
    }
    const pedidos = await pedidoService.listarPorCliente(cliente.id);
    res.json(pedidos);
  } catch (error) {
    next(error);
  }
});

// El cliente informa que pagó por Yape (número de operación del comprobante)
router.post("/:id/reportar-pago-yape", verificarToken, async (req, res, next) => {
  try {
    const cliente = await clienteService.obtenerPorUid(req.usuario.uid);
    if (!cliente) {
      return res.status(400).json({ error: "Debes completar tu registro de cliente primero" });
    }
    const pedido = await pedidoService.reportarPagoYape({
      pedidoId: req.params.id,
      clienteId: cliente.id,
      numeroOperacion: req.body?.numeroOperacion,
    });
    res.json(pedido);
  } catch (error) {
    next(error);
  }
});

// El administrador/almacenero ve todos los pedidos, con filtro opcional por estado
router.get("/", verificarToken, permitirRoles("administrador", "almacenero"), async (req, res, next) => {
  try {
    const pedidos = await pedidoService.listarTodos({ estado: req.query.estado });
    res.json(pedidos);
  } catch (error) {
    next(error);
  }
});

// Solo el administrador confirma el pago inicial y cambia estados
router.post(
  "/:id/confirmar-pago",
  verificarToken,
  permitirRoles("administrador"),
  async (req, res, next) => {
    try {
      const pedido = await pedidoService.confirmarPagoInicial(req.params.id, req.usuario);
      res.json(pedido);
    } catch (error) {
      next(error);
    }
  }
);

// El administrador no encontró el pago en su Yape: lo rechaza indicando el motivo
router.post(
  "/:id/rechazar-pago",
  verificarToken,
  permitirRoles("administrador"),
  async (req, res, next) => {
    try {
      const pedido = await pedidoService.rechazarPago(req.params.id, req.body?.motivo, req.usuario);
      res.json(pedido);
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  "/:id/estado",
  verificarToken,
  permitirRoles("administrador"),
  async (req, res, next) => {
    try {
      const pedido = await pedidoService.cambiarEstado(req.params.id, req.body.estado);
      res.json(pedido);
    } catch (error) {
      next(error);
    }
  }
);

export default router;