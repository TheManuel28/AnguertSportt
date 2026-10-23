import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import { useTiempoReal } from "../hooks/useTiempoReal";

const ESTADOS = [
  "PENDIENTE_PAGO_INICIAL",
  "PAGO_EN_REVISION",
  "CONFIRMADO",
  "EN_PREPARACION",
  "LISTO_PARA_ENTREGA",
  "ENTREGADO",
  "CANCELADO",
];

const ETIQUETAS_ESTADO = {
  PENDIENTE_PAGO_INICIAL: "Pendiente de pago inicial",
  PAGO_EN_REVISION: "Pago en revisión",
  CONFIRMADO: "Confirmado",
  EN_PREPARACION: "En preparación",
  LISTO_PARA_ENTREGA: "Listo para entrega",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado",
};

// Mientras no se confirme el pago inicial no se puede avanzar el pedido con el selector
const ESTADOS_SIN_PAGO = ["PENDIENTE_PAGO_INICIAL", "PAGO_EN_REVISION"];

const MOTIVOS_RECHAZO = [
  "No veo ese pago en mi Yape",
  "El monto no coincide con el pago inicial",
  "El número de operación no es válido",
];

function formatearHora(fecha) {
  if (!fecha) return "";
  const ms = fecha._seconds ? fecha._seconds * 1000 : Date.parse(fecha);
  if (Number.isNaN(ms)) return "";
  return new Date(ms).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" });
}

export default function AdminPedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [procesando, setProcesando] = useState(null); // id del pedido con una acción en curso
  const [rechazando, setRechazando] = useState(null); // id del pedido cuyo rechazo se está redactando
  const [motivo, setMotivo] = useState("");
  const accionEnCurso = useRef(false); // se activa al instante: el estado de React no alcanza para frenar clics muy seguidos

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

  function reemplazar(pedido) {
    setPedidos((prev) => prev.map((p) => (p.id === pedido.id ? pedido : p)));
  }

  // Ejecuta una acción sobre un pedido evitando dobles clics
  async function ejecutar(pedidoId, accion, textoExito) {
    if (accionEnCurso.current) return;
    accionEnCurso.current = true;
    setError("");
    setProcesando(pedidoId);
    try {
      const pedido = await accion();
      reemplazar(pedido);
      mostrarMensaje(textoExito);
    } catch (err) {
      setError(err.message);
      cargarPedidos(filtroEstado, { silencioso: true }); // por si otro administrador ya lo resolvió
    } finally {
      accionEnCurso.current = false;
      setProcesando(null);
    }
  }

  const confirmarPago = (id) =>
    ejecutar(id, () => api.post(`/pedidos/${id}/confirmar-pago`), "Pago confirmado: el stock ya se descontó");

  const cambiarEstado = (id, estado) =>
    ejecutar(id, () => api.patch(`/pedidos/${id}/estado`, { estado }), `Pedido actualizado a "${ETIQUETAS_ESTADO[estado]}"`);

  function cancelarPedido(id) {
    if (!window.confirm("¿Cancelar este pedido?")) return;
    cambiarEstado(id, "CANCELADO");
  }

  async function enviarRechazo(id) {
    await ejecutar(
      id,
      () => api.post(`/pedidos/${id}/rechazar-pago`, { motivo }),
      "Pago rechazado: el cliente verá el motivo y podrá reintentar"
    );
    setRechazando(null);
    setMotivo("");
  }

  if (cargando) return <p style={{ padding: "2rem" }}>Cargando pedidos...</p>;

  const porRevisar = pedidos.filter((p) => p.estado === "PAGO_EN_REVISION").length;

  return (
    <div className="admin-pedidos">
      <h1>Pedidos</h1>

      {mensaje && <div className="aviso aviso-exito">{mensaje}</div>}
      {error && <div className="aviso aviso-error">{error}</div>}

      {porRevisar > 0 && filtroEstado !== "PAGO_EN_REVISION" && (
        <div className="aviso aviso-yape">
          <span>
            {porRevisar === 1 ? "Hay 1 pago de Yape por revisar" : `Hay ${porRevisar} pagos de Yape por revisar`}
          </span>
          <button
            type="button"
            className="enlace-boton"
            onClick={() => {
              setFiltroEstado("PAGO_EN_REVISION");
              cargarPedidos("PAGO_EN_REVISION");
            }}
          >
            Ver solo esos
          </button>
        </div>
      )}

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
        {pedidos.map((p) => {
          const ocupado = procesando === p.id;
          const sinPago = ESTADOS_SIN_PAGO.includes(p.estado);
          return (
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

              {p.estado === "PAGO_EN_REVISION" && p.pagoYape && (
                <div className="pago-yape-revisar">
                  <strong>Pago por Yape reportado</strong>
                  <div>
                    Operación N° <b>{p.pagoYape.numeroOperacion}</b> · debe ser de{" "}
                    <b>S/ {p.pagoYape.montoEsperado.toFixed(2)}</b>
                  </div>
                  <div className="texto-ayuda">
                    Reportado {formatearHora(p.pagoYape.reportadoEn)}. Compruébalo en tu app de Yape (monto y
                    número de operación) antes de confirmar.
                  </div>
                </div>
              )}

              {p.estado === "PENDIENTE_PAGO_INICIAL" && p.pagoRechazo && (
                <div className="texto-ayuda">Último rechazo: {p.pagoRechazo.motivo}</div>
              )}

              <div className="acciones-pedido-admin">
                {sinPago && (
                  <button
                    type="button"
                    className="boton-primario"
                    disabled={ocupado}
                    onClick={() => confirmarPago(p.id)}
                  >
                    {ocupado ? "Procesando..." : "Confirmar pago inicial"}
                  </button>
                )}
                {p.estado === "PAGO_EN_REVISION" && rechazando !== p.id && (
                  <button type="button" className="boton-secundario" disabled={ocupado} onClick={() => setRechazando(p.id)}>
                    Rechazar pago
                  </button>
                )}
                {sinPago && (
                  <button type="button" className="enlace-boton" disabled={ocupado} onClick={() => cancelarPedido(p.id)}>
                    Cancelar pedido
                  </button>
                )}
                {!sinPago && p.estado !== "CANCELADO" && (
                  <select value={p.estado} disabled={ocupado} onChange={(e) => cambiarEstado(p.id, e.target.value)}>
                    {ESTADOS.filter((e) => !ESTADOS_SIN_PAGO.includes(e)).map((e) => (
                      <option key={e} value={e}>
                        {ETIQUETAS_ESTADO[e]}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {rechazando === p.id && (
                <div className="rechazo-pago">
                  <label>Motivo (el cliente lo verá)</label>
                  <div className="rechazo-pago-motivos">
                    {MOTIVOS_RECHAZO.map((m) => (
                      <button key={m} type="button" className="enlace-boton" onClick={() => setMotivo(m)}>
                        {m}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={motivo}
                    maxLength={200}
                    placeholder="Escribe el motivo del rechazo"
                    onChange={(e) => setMotivo(e.target.value)}
                  />
                  <div className="acciones-pedido-admin">
                    <button
                      type="button"
                      className="boton-primario"
                      disabled={ocupado || motivo.trim().length < 3}
                      onClick={() => enviarRechazo(p.id)}
                    >
                      Enviar rechazo
                    </button>
                    <button
                      type="button"
                      className="enlace-boton"
                      onClick={() => {
                        setRechazando(null);
                        setMotivo("");
                      }}
                    >
                      Volver
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}