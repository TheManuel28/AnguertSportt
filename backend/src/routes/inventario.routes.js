import { Router } from "express";
import { verificarToken, permitirRoles } from "../middleware/auth.js";
import { inventarioService } from "../services/inventarioService.js";

const router = Router();

router.use(verificarToken, permitirRoles("administrador", "almacenero"));

router.post("/movimientos", async (req, res, next) => {
  try {
    const { tipo, varianteId, cantidad, motivo, observacion } = req.body;
    const movimiento = await inventarioService.registrarMovimiento({
      tipo,
      varianteId,
      cantidad,
      motivo,
      observacion,
      usuario: req.usuario,
    });
    res.status(201).json(movimiento);
  } catch (error) {
    next(error);
  }
});
router.get("/variantes", async (req, res, next) => {
  try {
    const variantes = await inventarioService.listarVariantes();
    res.json(variantes);
  } catch (error) {
    next(error);
  }
});
router.get("/movimientos", async (req, res, next) => {
  try {
    const { varianteId, tipo } = req.query;
    const historial = await inventarioService.historial({ varianteId, tipo });
    res.json(historial);
  } catch (error) {
    next(error);
  }
});

router.get("/stock-critico", async (req, res, next) => {
  try {
    const variantes = await inventarioService.listarStockCritico();
    res.json(variantes);
  } catch (error) {
    next(error);
  }
});

export default router;
