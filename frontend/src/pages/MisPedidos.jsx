import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import PagoYape from "../components/PagoYape";

function formatearFecha(fecha) {
  if (!fecha) return "-";
  const ms = fecha._seconds ? fecha._seconds * 1000 : Date.parse(fecha);
  if (Number.isNaN(ms)) return "-";
  return new Date(ms).toLocaleDateString("es-PE", { dateStyle: "medium" });
}

const ETIQUETAS_ESTADO = {
  PENDIENTE_PAGO_INICIAL: "Pendiente de pago inicial",
  PAGO_EN_REVISION: "Pago en revisión",
  CONFIRMADO: "Confirmado",
  EN_PREPARACION: "En preparación",
  LISTO_PARA_ENTREGA: "Listo para entrega",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado",
};

export default function MisPedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState("");

  const cargar = useCallback((esRecarga = false) => {
    if (esRecarga) setActualizando(true);
    setError("");
    api
      .get("/pedidos/mis-pedidos")
      .then(setPedidos)
      .catch(() => setError("No se pudieron cargar tus pedidos"))
      .finally(() => {
        setCargando(false);
        setActualizando(false);
      });
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function reemplazarPedido(actualizado) {
    setPedidos((prev) => prev.map((p) => (p.id === actualizado.id ? actualizado : p)));
  }

  if (cargando) return <p style={{ padding: "2rem" }}>Cargando tus pedidos...</p>;
  if (error) return <p style={{ padding: "2rem", color: "#c0392b" }}>{error}</p>;

  return (
    <div className="mis-pedidos">
      <div className="mis-pedidos-cabecera">
        <h1>Mis pedidos</h1>
        <button type="button" className="enlace-boton" onClick={() => cargar(true)} disabled={actualizando}>
          {actualizando ? "Actualizando..." : "↻ Actualizar"}
        </button>
      </div>
      {pedidos.length === 0 && <p>Todavía no tienes pedidos.</p>}

      <div className="lista-pedidos">
        {pedidos.map((p) => (
          <div key={p.id} className="panel tarjeta-pedido">
            <div className="tarjeta-pedido-encabezado">
              <span className={`etiqueta-estado-pedido estado-${p.estado?.toLowerCase()}`}>
                {ETIQUETAS_ESTADO[p.estado] || p.estado}
              </span>
              <span className="texto-ayuda">{formatearFecha(p.fechaCreacion)}</span>
            </div>

            <ul className="items-pedido">
              {p.items.map((item, i) => (
                <li key={i}>
                  {item.cantidad}× {item.productoNombre} ({item.talla}/{item.color})
                </li>
              ))}
            </ul>

            <div className="tarjeta-pedido-totales">
              <span>Total: S/ {p.total.toFixed(2)}</span>
              <span>Pago inicial: S/ {p.pagoInicial.toFixed(2)}</span>
              <span>Restante: S/ {p.pagoRestante.toFixed(2)}</span>
            </div>

            <PagoYape pedido={p} onActualizado={reemplazarPedido} />
          </div>
        ))}
      </div>
    </div>
  );
}