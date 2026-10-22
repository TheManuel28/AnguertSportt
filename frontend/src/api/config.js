// URL base del API. En desarrollo queda vacía (el proxy de Vite resuelve "/api");
// en producción se define con VITE_API_URL (ej. https://angher-api.onrender.com).
export const API_BASE = `${(import.meta.env.VITE_API_URL || "").replace(/\/+$/, "")}/api`;