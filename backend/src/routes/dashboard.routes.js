import { Router } from "express";
import { verificarToken, permitirRoles } from "../middleware/auth.js";
import { dashboardService } from "../services/dashboardService.js";

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

export default router;
