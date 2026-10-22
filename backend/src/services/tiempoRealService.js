import { db } from "../config/firebase.js";

/**
 * Tiempo real respetando la regla "el frontend nunca toca Firestore" (RNF05):
 * el BACKEND escucha los cambios con el Admin SDK (onSnapshot) y avisa a los
 * administradores conectados mediante Server-Sent Events. El aviso es mínimo
 * (qué colección cambió y cuántos documentos); los datos reales los vuelve a
 * pedir el frontend por las rutas REST de siempre, que ya validan token y rol.
 *
 * Los oyentes de Firestore solo existen mientras haya alguien conectado, para
 * no gastar lecturas de Firestore cuando nadie mira.
 */
const COLECCIONES = ["pedidos", "variantes", "movimientos", "productos"];
const ESPERA_AGRUPAR_MS = 250; // junta ráfagas de cambios (una transacción toca varios documentos)
const REINTENTO_MS = 5000;

const clientes = new Set();
const pendientes = new Map(); // coleccion -> { agregados, modificados, eliminados, temporizador }
let detenedores = [];
let temporizadorReintento = null;

function enviar(res, evento, datos) {
  res.write(`event: ${evento}\ndata: ${JSON.stringify(datos)}\n\n`);
}

function difundir(evento, datos) {
  for (const res of clientes) enviar(res, evento, datos);
}

function registrarCambios(coleccion, cambios) {
  let p = pendientes.get(coleccion);
  if (!p) {
    p = { agregados: 0, modificados: 0, eliminados: 0, temporizador: null };
    pendientes.set(coleccion, p);
  }
  for (const c of cambios) {
    if (c.type === "added") p.agregados++;
    else if (c.type === "modified") p.modificados++;
    else if (c.type === "removed") p.eliminados++;
  }
  clearTimeout(p.temporizador);
  p.temporizador = setTimeout(() => {
    pendientes.delete(coleccion);
    difundir("cambio", {
      coleccion,
      agregados: p.agregados,
      modificados: p.modificados,
      eliminados: p.eliminados,
    });
  }, ESPERA_AGRUPAR_MS);
}

function iniciarOyentes() {
  if (detenedores.length > 0) return;
  for (const nombre of COLECCIONES) {
    let primera = true;
    const detener = db.collection(nombre).onSnapshot(
      (snapshot) => {
        // La primera entrega es la carga inicial de la colección, no un cambio
        if (primera) {
          primera = false;
          return;
        }
        registrarCambios(nombre, snapshot.docChanges());
      },
      (error) => {
        console.error(`[tiempo real] error escuchando "${nombre}":`, error.message);
        detenerOyentes();
        if (clientes.size > 0 && !temporizadorReintento) {
          temporizadorReintento = setTimeout(() => {
            temporizadorReintento = null;
            if (clientes.size === 0) return;
            iniciarOyentes();
            // Pudo haber cambios mientras no se escuchaba: que cada cliente vuelva a consultar
            difundir("resincronizar", {});
          }, REINTENTO_MS);
        }
      }
    );
    detenedores.push(detener);
  }
}

function detenerOyentes() {
  for (const detener of detenedores) detener();
  detenedores = [];
  for (const p of pendientes.values()) clearTimeout(p.temporizador);
  pendientes.clear();
}

export const tiempoRealService = {
  agregarCliente(res) {
    clientes.add(res);
    iniciarOyentes();
    enviar(res, "listo", {});
  },

  quitarCliente(res) {
    clientes.delete(res);
    if (clientes.size === 0) {
      clearTimeout(temporizadorReintento);
      temporizadorReintento = null;
      detenerOyentes();
    }
  },
};