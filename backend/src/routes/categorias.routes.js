import { Router } from "express";
import { verificarToken, permitirRoles } from "../middleware/auth.js";
import { categoriaService } from "../services/categoriaService.js";

const router = Router();

// Público: el catálogo y los formularios de admin necesitan leer categorías
router.get("/", async (req, res, next) => {
  try {
    const categorias = await categoriaService.listar();
    res.json(categorias);
  } catch (error) {
    next(error);
  }
});

router.post("/", verificarToken, permitirRoles("administrador"), async (req, res, next) => {
  try {
    const categoria = await categoriaService.crear(req.body);
    res.status(201).json(categoria);
  } catch (error) {
    next(error);
  }
});

export default router;