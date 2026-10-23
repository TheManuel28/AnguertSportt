// URL base del API. En desarrollo queda vacía (el proxy de Vite resuelve "/api");
// en producción se define con VITE_API_URL (ej. https://angher-api.onrender.com).
// Solo se usa el dominio: si por error se pega una ruta (…/api/salud), se descarta.
const bruto = (import.meta.env.VITE_API_URL || "").trim();
let base = "";
if (bruto) {
  try {
    base = new URL(bruto).origin;
  } catch {
    base = bruto.replace(/\/+$/, "");
  }
}
export const API_BASE = `${base}/api`;