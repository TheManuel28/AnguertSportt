import { Router } from "express";
import { verificarToken, permitirRoles } from "../middleware/auth.js";
import { tiempoRealService } from "../services/tiempoRealService.js";

const router = Router();

const LATIDO_MS = 25 * 1000; // evita que proxies/navegadores cierren la conexión por inactividad
// El ID Token de Firebase dura 1 hora. Se cierra antes para que el frontend
// reconecte solo con un token nuevo (la conexión nunca queda autenticada con uno vencido).
const VIDA_MAXIMA_MS = 50 * 60 * 1000;

router.get(
  "/",
  verificarToken,
  permitirRoles("administrador", "almacenero"),
  (req, res) => {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    tiempoRealService.agregarCliente(res);

    const latido = setInterval(() => res.write(": latido\n\n"), LATIDO_MS);
    const vencimiento = setTimeout(() => res.end(), VIDA_MAXIMA_MS);

    req.on("close", () => {
      clearInterval(latido);
      clearTimeout(vencimiento);
      tiempoRealService.quitarCliente(res);
    });
  }
);

export default router;