import { useEffect, useRef } from "react";
import { suscribir } from "../api/tiempoReal";

/**
 * Ejecuta `alCambiar` cuando el backend avisa que cambió alguna de las
 * colecciones indicadas (por ejemplo ["pedidos"] o ["variantes", "movimientos"]).
 * Agrupa avisos seguidos (una operación puede tocar varias colecciones) para
 * no recargar varias veces. `alCambiar` recibe { agregados }: cuántos
 * documentos NUEVOS llegaron (útil para avisar "nuevo pedido").
 */
const AGRUPAR_MS = 400;

export function useTiempoReal(colecciones, alCambiar) {
  const funcion = useRef(alCambiar);
  useEffect(() => {
    funcion.current = alCambiar; // siempre la versión más reciente (filtros actuales, etc.)
  });

  const clave = colecciones.join(",");

  useEffect(() => {
    let temporizador = null;
    let agregados = 0;

    const cancelar = suscribir(clave ? clave.split(",") : [], (evento) => {
      agregados += evento.agregados ?? 0;
      clearTimeout(temporizador);
      temporizador = setTimeout(() => {
        const info = { agregados };
        agregados = 0;
        funcion.current(info);
      }, AGRUPAR_MS);
    });

    return () => {
      clearTimeout(temporizador);
      cancelar();
    };
  }, [clave]);
}