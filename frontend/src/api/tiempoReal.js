import { auth } from "../firebase";
import { API_BASE } from "./config";
/**
 * Conexión de tiempo real con el backend (Server-Sent Events).
 *
 * Se usa fetch + streaming en vez de EventSource porque EventSource no permite
 * enviar el header "Authorization" y el backend exige el token de Firebase.
 * Hay UNA sola conexión compartida por toda la app; cada pantalla se suscribe
 * a las colecciones que le interesan con useTiempoReal().
 */
const URL_EVENTOS = `${API_BASE}/eventos`;
const GRACIA_CIERRE_MS = 3000; // al cambiar de pantalla no se cierra y reabre la conexión

const oyentes = new Set(); // { colecciones: string[], callback }
const oyentesEstado = new Set();

// "desconectado" | "conectando" | "conectado" | "sin-permiso"
let estado = "desconectado";
let controlador = null;
let temporizadorReconexion = null;
let temporizadorCierre = null;
let intentos = 0;
let yaConectoAntes = false;

function cambiarEstado(nuevo) {
  if (estado === nuevo) return;
  estado = nuevo;
  oyentesEstado.forEach((fn) => fn());
}

function notificar(coleccion, datos) {
  for (const o of oyentes) {
    if (coleccion === "*" || o.colecciones.includes(coleccion)) {
      o.callback({ coleccion, ...datos });
    }
  }
}

function procesarBloque(bloque) {
  let evento = "message";
  let datos = "";
  for (const linea of bloque.split("\n")) {
    if (linea.startsWith(":")) continue; // comentario / latido
    if (linea.startsWith("event:")) evento = linea.slice(6).trim();
    else if (linea.startsWith("data:")) datos += linea.slice(5).trim();
  }

  if (evento === "listo") {
    intentos = 0;
    cambiarEstado("conectado");
    // Si es una reconexión, pudo haber cambios mientras no se escuchaba
    if (yaConectoAntes) notificar("*", {});
    yaConectoAntes = true;
  } else if (evento === "cambio") {
    try {
      const cambio = JSON.parse(datos);
      notificar(cambio.coleccion, cambio);
    } catch {
      /* mensaje corrupto: se ignora */
    }
  } else if (evento === "resincronizar") {
    notificar("*", {});
  }
}

function programarReconexion() {
  if (temporizadorReconexion) return;
  const espera = Math.min(1000 * 2 ** intentos, 15000);
  intentos++;
  temporizadorReconexion = setTimeout(() => {
    temporizadorReconexion = null;
    conectar();
  }, espera);
}

async function conectar() {
  if (controlador || oyentes.size === 0) return;

  const usuario = auth.currentUser;
  if (!usuario) {
    programarReconexion(); // todavía restaurando la sesión
    return;
  }

  const ctl = new AbortController();
  controlador = ctl;
  cambiarEstado("conectando");
  let reintentar = true;

  try {
    const token = await usuario.getIdToken();
    const respuesta = await fetch(URL_EVENTOS, {
      headers: { Authorization: `Bearer ${token}`, Accept: "text/event-stream" },
      signal: ctl.signal,
    });

    if (respuesta.status === 403) {
      reintentar = false; // el usuario no es admin/almacenero: no tiene sentido insistir
      cambiarEstado("sin-permiso");
      return;
    }
    if (!respuesta.ok || !respuesta.body) throw new Error(`HTTP ${respuesta.status}`);

    const lector = respuesta.body.getReader();
    const decodificador = new TextDecoder();
    let buffer = "";
    for (;;) {
      const { value, done } = await lector.read();
      if (done) break;
      buffer = (buffer + decodificador.decode(value, { stream: true })).replace(/\r\n/g, "\n");
      let corte;
      while ((corte = buffer.indexOf("\n\n")) !== -1) {
        procesarBloque(buffer.slice(0, corte));
        buffer = buffer.slice(corte + 2);
      }
    }
  } catch {
    if (ctl.signal.aborted) reintentar = false;
  } finally {
    if (controlador === ctl) controlador = null;
    if (estado !== "sin-permiso") cambiarEstado("desconectado");
    if (reintentar && oyentes.size > 0) programarReconexion();
  }
}

function cerrar() {
  temporizadorCierre = null;
  if (oyentes.size > 0) return;
  clearTimeout(temporizadorReconexion);
  temporizadorReconexion = null;
  controlador?.abort();
  intentos = 0;
  yaConectoAntes = false;
  cambiarEstado("desconectado");
}

/** Se suscribe a cambios de las colecciones indicadas. Devuelve la función para cancelar. */
export function suscribir(colecciones, callback) {
  const oyente = { colecciones, callback };
  oyentes.add(oyente);
  clearTimeout(temporizadorCierre);
  temporizadorCierre = null;
  conectar();

  return () => {
    oyentes.delete(oyente);
    if (oyentes.size === 0) temporizadorCierre = setTimeout(cerrar, GRACIA_CIERRE_MS);
  };
}

export function estadoConexion() {
  return estado;
}

export function suscribirEstado(fn) {
  oyentesEstado.add(fn);
  return () => oyentesEstado.delete(fn);
}