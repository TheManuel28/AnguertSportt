import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";

const MOTIVOS_POR_TIPO = {
  ENTRADA: ["PRODUCCION", "COMPRA", "DEVOLUCION_CLIENTE", "AJUSTE_POSITIVO"],
  SALIDA: ["VENTA", "PEDIDO_MAYORISTA", "MERMA", "MUESTRA", "AJUSTE_NEGATIVO"],
  AJUSTE: ["CONTEO_FISICO"],
};

const AYUDA_CANTIDAD = {
  ENTRADA: "Cantidad que ingresa al stock",
  SALIDA: "Cantidad que sale del stock",
  AJUSTE: "Nuevo stock total (el número real que contaste físicamente, no la diferencia)",
};

function formatearFecha(fecha) {
  if (!fecha) return "-";
  const ms = fecha._seconds ? fecha._seconds * 1000 : Date.parse(fecha);
  if (Number.isNaN(ms)) return "-";
  return new Date(ms).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" });
}

export default function AdminInventario() {
  const [variantes, setVariantes] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [busqueda, setBusqueda] = useState("");
  const [varianteId, setVarianteId] = useState("");
  const [tipo, setTipo] = useState("ENTRADA");
  const [cantidad, setCantidad] = useState("");
  const [motivo, setMotivo] = useState(MOTIVOS_POR_TIPO.ENTRADA[0]);
  const [observacion, setObservacion] = useState("");

  const [filtroTipo, setFiltroTipo] = useState("");

  async function cargarVariantes() {
    const data = await api.get("/inventario/variantes");
    setVariantes(data);
  }

  async function cargarHistorial(tipoFiltro = filtroTipo) {
    const query = tipoFiltro ? `?tipo=${tipoFiltro}` : "";
    const data = await api.get(`/inventario/movimientos${query}`);
    setHistorial(data);
  }

  async function cargarTodo() {
    setCargando(true);
    setError("");
    try {
      await Promise.all([cargarVariantes(), cargarHistorial()]);
    } catch (err) {
      setError(err.message || "No se pudo cargar el inventario");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarTodo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const varianteSeleccionada = variantes.find((v) => v.id === varianteId);

  const variantesFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return variantes;
    return variantes.filter((v) =>
      `${v.productoNombre} ${v.talla} ${v.color} ${v.codigoSku}`.toLowerCase().includes(texto)
    );
  }, [variantes, busqueda]);

  function cambiarTipo(nuevoTipo) {
    setTipo(nuevoTipo);
    setMotivo(MOTIVOS_POR_TIPO[nuevoTipo][0]);
  }

  function mostrarMensaje(texto) {
    setMensaje(texto);
    setTimeout(() => setMensaje(""), 3000);
  }

  async function registrarMovimiento(e) {
    e.preventDefault();
    setError("");

    if (!varianteId) {
      setError("Selecciona una variante");
      return;
    }
    if (!cantidad || Number(cantidad) <= 0) {
      setError("La cantidad debe ser un número mayor a 0");
      return;
    }

    try {
      const movimiento = await api.post("/inventario/movimientos", {
        tipo,
        varianteId,
        cantidad: Number(cantidad),
        motivo,
        observacion,
      });

      // Actualiza el stock de la variante en la lista, sin recargar todo
      setVariantes((prev) =>
        prev.map((v) =>
          v.id === varianteId
            ? {
                ...v,
                stockActual: movimiento.stockResultante,
                estadoStock:
                  movimiento.stockResultante <= 0
                    ? "AGOTADO"
                    : movimiento.stockResultante <= v.stockMinimo
                    ? "BAJO"
                    : "NORMAL",
              }
            : v
        )
      );

      setHistorial((prev) => [movimiento, ...prev]);
      setCantidad("");
      setObservacion("");
      mostrarMensaje(
        `Movimiento registrado: ${movimiento.productoNombre} (${movimiento.talla}/${movimiento.color}) → nuevo stock ${movimiento.stockResultante}`
      );
    } catch (err) {
      setError(err.message);
    }
  }

  async function cambiarFiltro(nuevoTipo) {
    setFiltroTipo(nuevoTipo);
    try {
      await cargarHistorial(nuevoTipo);
    } catch (err) {
      setError(err.message);
    }
  }

  if (cargando) return <p style={{ padding: "2rem" }}>Cargando inventario...</p>;

  return (
    <div className="admin-inventario">
      <h1>Movimientos de inventario</h1>

      {mensaje && <div className="aviso aviso-exito">{mensaje}</div>}
      {error && <div className="aviso aviso-error">{error}</div>}

      <section className="panel">
        <h2>Registrar movimiento</h2>

        <div className="selector-tipo">
          {["ENTRADA", "SALIDA", "AJUSTE"].map((opcion) => (
            <button
              key={opcion}
              type="button"
              className={`chip-tipo chip-${opcion.toLowerCase()} ${tipo === opcion ? "activo" : ""}`}
              onClick={() => cambiarTipo(opcion)}
            >
              {opcion === "ENTRADA" && "＋ Entrada"}
              {opcion === "SALIDA" && "－ Salida"}
              {opcion === "AJUSTE" && "⚖ Ajuste"}
            </button>
          ))}
        </div>

        <form className="formulario-grid" onSubmit={registrarMovimiento}>
          <label className="col-completa">
            Buscar variante
            <input
              type="text"
              placeholder="Escribe el producto, talla, color o SKU..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </label>

          <label className="col-completa">
            Variante
            <select value={varianteId} onChange={(e) => setVarianteId(e.target.value)} required>
              <option value="">
                {variantesFiltradas.length === 0
                  ? "No hay variantes que coincidan"
                  : "Selecciona una variante"}
              </option>
              {variantesFiltradas.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.productoNombre} — {v.talla}/{v.color} — SKU {v.codigoSku} (stock: {v.stockActual})
                </option>
              ))}
            </select>
          </label>

          {varianteSeleccionada && (
            <p className={`nota-stock nota-${varianteSeleccionada.estadoStock?.toLowerCase()} col-completa`}>
              Stock actual: <strong>{varianteSeleccionada.stockActual}</strong> · Mínimo:{" "}
              {varianteSeleccionada.stockMinimo} · Estado: {varianteSeleccionada.estadoStock}
            </p>
          )}

          <label>
            {tipo === "AJUSTE" ? "Nuevo stock (conteo físico)" : "Cantidad"}
            <input
              type="number"
              min="0"
              step="1"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              required
            />
            <span className="texto-ayuda">{AYUDA_CANTIDAD[tipo]}</span>
          </label>

          <label>
            Motivo
            <select value={motivo} onChange={(e) => setMotivo(e.target.value)}>
              {MOTIVOS_POR_TIPO[tipo].map((m) => (
                <option key={m} value={m}>
                  {m.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>

          <label className="col-completa">
            Observación (opcional)
            <textarea
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              rows={2}
              placeholder="Ej: guía de remisión N° 001-234"
            />
          </label>

          <button type="submit" className={`boton-primario col-completa boton-${tipo.toLowerCase()}`}>
            Registrar {tipo.toLowerCase()}
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="panel-encabezado">
          <h2>Historial de movimientos</h2>
          <select value={filtroTipo} onChange={(e) => cambiarFiltro(e.target.value)}>
            <option value="">Todos los tipos</option>
            <option value="ENTRADA">Entradas</option>
            <option value="SALIDA">Salidas</option>
            <option value="AJUSTE">Ajustes</option>
          </select>
        </div>

        {historial.length === 0 && <p>No hay movimientos registrados todavía.</p>}

        <div className="tabla-historial">
          {historial.map((m) => (
            <div key={m.id} className={`fila-historial fila-${m.tipo.toLowerCase()}`}>
              <span className={`etiqueta-tipo etiqueta-${m.tipo.toLowerCase()}`}>{m.tipo}</span>
              <span className="col-producto">
                {m.productoNombre} <small>({m.talla}/{m.color})</small>
              </span>
              <span>{m.cantidad} un.</span>
              <span className="col-stock">
                {m.stockAnterior} → <strong>{m.stockResultante}</strong>
              </span>
              <span className="col-motivo">{m.motivo?.replaceAll("_", " ")}</span>
              <span className="col-fecha">{formatearFecha(m.fecha)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}