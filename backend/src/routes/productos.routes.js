import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { verificarToken, permitirRoles } from "../middleware/auth.js";
import { productoService } from "../services/productoService.js";

const router = Router();

// Carpeta física donde se guardan las imágenes de productos, en el proyecto
// del frontend (backend y frontend son carpetas hermanas dentro de
// angher-sport/). Si mueves los proyectos, ajusta esta ruta.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CARPETA_IMAGENES = path.join(__dirname, "..", "..", "..", "frontend", "public", "productos");

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

// Lista los archivos que ya están en frontend/public/productos/, para que el
// admin elija de un desplegable en vez de escribir el nombre del archivo a mano.
// IMPORTANTE: esta ruta debe ir antes que "/:id", si no Express interpretaría
// "imagenes-disponibles" como si fuera el id de un producto.
router.get(
  "/imagenes-disponibles",
  verificarToken,
  permitirRoles("administrador", "almacenero"),
  (req, res) => {
    try {
      if (!fs.existsSync(CARPETA_IMAGENES)) {
        return res.json([]);
      }
      const archivos = fs
        .readdirSync(CARPETA_IMAGENES)
        .filter((nombre) => /\.(png|jpe?g|webp|gif)$/i.test(nombre))
        .sort()
        .map((nombre) => ({ nombre, ruta: `/productos/${nombre}` }));
      res.json(archivos);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "No se pudo leer la carpeta de imágenes" });
    }
  }
);

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