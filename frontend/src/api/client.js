import { auth } from "../firebase";
import { API_BASE as BASE_URL } from "./config";

async function request(path, options = {}) {
  const usuario = auth.currentUser;
  const headers = { "Content-Type": "application/json", ...options.headers };

  if (usuario) {
    const token = await usuario.getIdToken();
    headers.Authorization = `Bearer ${token}`;
  }

  const respuesta = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const data = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    throw new Error(data?.error || "Error en la solicitud");
  }
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: "PATCH", body: JSON.stringify(body) }),
  del: (path) => request(path, { method: "DELETE" }),
};
