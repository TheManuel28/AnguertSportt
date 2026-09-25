import express from "express";
import cors from "cors";
import morgan from "morgan";
import { manejadorErrores } from "./middleware/errorHandler.js";

import productosRoutes from "./routes/productos.routes.js";
import inventarioRoutes from "./routes/inventario.routes.js";
import pedidosRoutes from "./routes/pedidos.routes.js";
import clientesRoutes from "./routes/clientes.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import categoriasRoutes from "./routes/categorias.routes.js";
const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/", (req, res) => res.json({ ok: true, proyecto: "AS-06 Angher Sport" }));

app.use("/api/productos", productosRoutes);
app.use("/api/inventario", inventarioRoutes);
app.use("/api/pedidos", pedidosRoutes);
app.use("/api/clientes", clientesRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/categorias", categoriasRoutes);

app.use(manejadorErrores);

export default app;
