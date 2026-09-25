import { Router } from "express";
import { verificarToken, permitirRoles } from "../middleware/auth.js";
import { productoService } from "../services/productoService.js";

const router = Router();

// Catálogo público: el cliente NO necesita estar autenticado para ver productos
router.get("/", async (req, res, next) => {
  try {
    const { categoriaId } = req.query;
    const productos = await productoService.listarCatalogo({ categoriaId, activo: true });
    res.json(productos);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const producto = await productoService.obtenerConVariantes(req.params.id);
    if (!producto) return res.status(404).json({ error: "Producto no encontrado" });
    res.json(producto);
  } catch (error) {
    next(error);
  }
});

// Gestión de productos: solo administrador
router.post("/", verificarToken, permitirRoles("administrador"), async (req, res, next) => {
  try {
    const producto = await productoService.crearProducto(req.body);
    res.status(201).json(producto);
  } catch (error) {
    next(error);
  }
});

router.post(
  "/:id/variantes",
  verificarToken,
  permitirRoles("administrador", "almacenero"),
  async (req, res, next) => {
    try {
      const variante = await productoService.agregarVariante(req.params.id, req.body);
      res.status(201).json(variante);
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  "/:id/imagen",
  verificarToken,
  permitirRoles("administrador"),
  async (req, res, next) => {
    try {
      const producto = await productoService.actualizarImagen(req.params.id, req.body.imagenUrl);
      res.json(producto);
    } catch (error) {
      next(error);
    }
  }
);
router.delete(
  "/:id/variantes/:varianteId",
  verificarToken,
  permitirRoles("administrador", "almacenero"),
  async (req, res, next) => {
    try {
      await productoService.eliminarVariante(req.params.id, req.params.varianteId);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }
);
export default router;
