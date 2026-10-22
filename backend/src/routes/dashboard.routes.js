import { Router } from "express";
import { verificarToken, permitirRoles } from "../middleware/auth.js";
import { dashboardService } from "../services/dashboardService.js";
import { iaService } from "../services/iaService.js";
const router = Router();

router.get(
  "/resumen",
  verificarToken,
  permitirRoles("administrador", "almacenero"),
  async (req, res, next) => {
    try {
      const resumen = await dashboardService.obtenerResumen();
      res.json(resumen);
    } catch (error) {
      next(error);
    }
  }
);
router.get(
  "/resumen-ia",
  verificarToken,
  permitirRoles("administrador", "almacenero"),
  async (req, res, next) => {
    try {
      const resumen = await dashboardService.obtenerResumen();
      const datos = await iaService.generarResumenEjecutivo(resumen, {
        forzar: req.query.refrescar === "1",
      });
      res.json(datos);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
