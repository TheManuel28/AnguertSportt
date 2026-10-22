import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useTiempoReal } from "../hooks/useTiempoReal";
const ESTADOS = [
  "PENDIENTE_PAGO_INICIAL",
  "CONFIRMADO",
  "EN_PREPARACION",
  "LISTO_PARA_ENTREGA",
  "ENTREGADO",
  "CANCELADO",
];

const ETIQUETAS_ESTADO = {
  PENDIENTE_PAGO_INICIAL: "Pendiente de pago inicial",
  CONFIRMADO: "Confirmado",
  EN_PREPARACION: "En preparación",
  LISTO_PARA_ENTREGA: "Listo para entrega",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado",
};

export default function AdminPedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");

    async function cargarPedidos(estado, { silencioso = false } = {}) {
    if (!silencioso) {
      setCargando(true);
      setError("");
    }
    try {
      const query = estado ? `?estado=${estado}` : "";
      const data = await api.get(`/pedidos${query}`);
      setPedidos(data);
    } catch (err) {
      if (!silencioso) setError(err.message);
    } finally {
      if (!silencioso) setCargando(false);
    }
  }

  useEffect(() => {
    cargarPedidos("");
  }, []);

  // Tiempo real: cuando llega o cambia un pedido, la lista se recarga sola (sin parpadeo)
  useTiempoReal(["pedidos"], ({ agregados }) => {
    cargarPedidos(filtroEstado, { silencioso: true });
    if (agregados > 0) {
      mostrarMensaje(agregados === 1 ? "Llegó un pedido nuevo" : `Llegaron ${agregados} pedidos nuevos`);
    }
  });

  function mostrarMensaje(texto) {
    setMensaje(texto);
    setTimeout(() => setMensaje(""), 3000);
  }

  async function confirmarPago(pedidoId) {
    setError("");
    try {
      const pedido = await api.post(`/pedidos/${pedidoId}/confirmar-pago`);
      setPedidos((prev) => prev.map((p) => (p.id === pedidoId ? pedido : p)));
      mostrarMensaje("Pago confirmado: el stock ya se descontó");
    } catch (err) {
      setError(err.message);
    }
  }

  async function cambiarEstado(pedidoId, estado) {
    setError("");
    try {
      const pedido = await api.patch(`/pedidos/${pedidoId}/estado`, { estado });
      setPedidos((prev) => prev.map((p) => (p.id === pedidoId ? pedido : p)));
      mostrarMensaje(`Pedido actualizado a "${ETIQUETAS_ESTADO[estado]}"`);
    } catch (err) {
      setError(err.message);
    }
  }

  if (cargando) return <p style={{ padding: "2rem" }}>Cargando pedidos...</p>;

  return (
    <div className="admin-pedidos">
      <h1>Pedidos</h1>

      {mensaje && <div className="aviso aviso-exito">{mensaje}</div>}
      {error && <div className="aviso aviso-error">{error}</div>}

      <div className="panel-encabezado">
        <span />
        <select
          value={filtroEstado}
          onChange={(e) => {
            setFiltroEstado(e.target.value);
            cargarPedidos(e.target.value);
          }}
        >
          <option value="">Todos los estados</option>
          {ESTADOS.map((e) => (
            <option key={e} value={e}>
              {ETIQUETAS_ESTADO[e]}
            </option>
          ))}
        </select>
      </div>

      {pedidos.length === 0 && <p>No hay pedidos para este filtro.</p>}

      <div className="lista-pedidos">
        {pedidos.map((p) => (
          <div key={p.id} className="panel tarjeta-pedido">
            <div className="tarjeta-pedido-encabezado">
              <span className={`etiqueta-estado-pedido estado-${p.estado?.toLowerCase()}`}>
                {ETIQUETAS_ESTADO[p.estado] || p.estado}
              </span>
              <span className="texto-ayuda">{p.clienteNombre || "Cliente sin nombre"}</span>
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

            <div className="acciones-pedido-admin">
              {p.estado === "PENDIENTE_PAGO_INICIAL" && (
                <button type="button" className="boton-primario" onClick={() => confirmarPago(p.id)}>
                  Confirmar pago inicial
                </button>
              )}
              {p.estado !== "PENDIENTE_PAGO_INICIAL" && p.estado !== "CANCELADO" && (
                <select value={p.estado} onChange={(e) => cambiarEstado(p.id, e.target.value)}>
                  {ESTADOS.filter((e) => e !== "PENDIENTE_PAGO_INICIAL").map((e) => (
                    <option key={e} value={e}>
                      {ETIQUETAS_ESTADO[e]}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}