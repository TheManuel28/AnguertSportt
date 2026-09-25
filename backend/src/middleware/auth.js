import { auth } from "../config/firebase.js";

/**
 * Verifica el ID Token de Firebase enviado como "Authorization: Bearer <token>"
 * y adjunta el usuario decodificado (uid, email, rol) a req.usuario.
 * El rol viaja como custom claim (ver scripts/asignarRol.js).
 */
export async function verificarToken(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.split(" ")[1] : null;

  if (!token) {
    return res.status(401).json({ error: "Token no proporcionado" });
  }

  try {
    const decoded = await auth.verifyIdToken(token);
    req.usuario = {
      uid: decoded.uid,
      email: decoded.email,
      rol: decoded.rol || "cliente",
    };
    next();
  } catch (error) {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
}

/**
 * Autorización por rol. Uso:
 *   router.post("/productos", verificarToken, permitirRoles("administrador"), crearProducto)
 */
export function permitirRoles(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario || !rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({ error: "No tienes permisos para esta acción" });
    }
    next();
  };
}
