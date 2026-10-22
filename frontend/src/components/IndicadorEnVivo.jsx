import { useEffect, useSyncExternalStore } from "react";
import { estadoConexion, suscribir, suscribirEstado } from "../api/tiempoReal";

const TEXTO = {
  conectado: "En vivo",
  conectando: "Conectando...",
  desconectado: "Reconectando...",
};

const AYUDA = {
  conectado: "Los datos se actualizan solos cuando alguien hace un cambio",
  conectando: "Estableciendo la conexión en tiempo real",
  desconectado: "Se perdió la conexión en tiempo real; reintentando",
};

export default function IndicadorEnVivo() {
  const estado = useSyncExternalStore(suscribirEstado, estadoConexion);

  // Mantiene abierta la conexión mientras el administrador está dentro del sistema
  useEffect(() => suscribir([], () => {}), []);

  if (estado === "sin-permiso") return null;

  return (
    <span className={`en-vivo en-vivo-${estado}`} title={AYUDA[estado]}>
      <span className="en-vivo-punto" />
      {TEXTO[estado]}
    </span>
  );
}