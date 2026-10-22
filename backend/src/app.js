import express from "express";
import cors from "cors";
import morgan from "morgan";
import { manejadorErrores } from "./middleware/errorHandler.js";
import reportesRoutes from "./routes/reportes.routes.js";
import productosRoutes from "./routes/productos.routes.js";
import inventarioRoutes from "./routes/inventario.routes.js";
import pedidosRoutes from "./routes/pedidos.routes.js";
import clientesRoutes from "./routes/clientes.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import categoriasRoutes from "./routes/categorias.routes.js";
import eventosRoutes from "./routes/eventos.routes.js";
const app = express();

// En producción FRONTEND_URL limita quién puede llamar al API (varios dominios separados por coma).
// Si no está definida, queda abierto como en desarrollo.
const origenesPermitidos = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
app.use(cors(origenesPermitidos.length ? { origin: origenesPermitidos } : undefined));
app.use(express.json());
app.use(morgan("dev"));

// Para que Render verifique que el servicio está vivo (y para "despertarlo")
app.get("/api/salud", (req, res) => res.json({ ok: true }));

app.use("/api/productos", productosRoutes);
app.use("/api/inventario", inventarioRoutes);
app.use("/api/pedidos", pedidosRoutes);
app.use("/api/clientes", clientesRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/categorias", categoriasRoutes);
app.use("/api/reportes", reportesRoutes);
app.use("/api/eventos", eventosRoutes);
app.use(manejadorErrores);

export default app;
