import { Router } from "express";
import { verificarToken, permitirRoles } from "../middleware/auth.js";
import { reporteService } from "../services/reporteService.js";

const router = Router();

router.use(verificarToken, permitirRoles("administrador", "almacenero"));

router.get("/inventario-general", async (req, res, next) => {
  try {
    const datos = await reporteService.inventarioGeneral();
    res.json(datos);
  } catch (error) {
    next(error);
  }
});

router.get("/movimientos", async (req, res, next) => {
  try {
    const { desde, hasta, tipo } = req.query;
    const datos = await reporteService.movimientos({ desde, hasta, tipo });
    res.json(datos);
  } catch (error) {
    next(error);
  }
});

router.get("/stock-bajo", async (req, res, next) => {
  try {
    const datos = await reporteService.stockBajo();
    res.json(datos);
  } catch (error) {
    next(error);
  }
});

router.get("/agotados", async (req, res, next) => {
  try {
    const datos = await reporteService.agotados();
    res.json(datos);
  } catch (error) {
    next(error);
  }
});

export default router;