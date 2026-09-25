import { Router } from "express";
import { verificarToken } from "../middleware/auth.js";
import { clienteService } from "../services/clienteService.js";

const router = Router();

router.post("/registro", verificarToken, async (req, res, next) => {
  try {
    const cliente = await clienteService.registrar({
      uid: req.usuario.uid,
      nombre: req.body.nombre,
      email: req.usuario.email,
      telefono: req.body.telefono,
    });
    res.status(201).json(cliente);
  } catch (error) {
    next(error);
  }
});

router.get("/perfil", verificarToken, async (req, res, next) => {
  try {
    const cliente = await clienteService.obtenerPorUid(req.usuario.uid);
    res.json(cliente);
  } catch (error) {
    next(error);
  }
});

export default router;
