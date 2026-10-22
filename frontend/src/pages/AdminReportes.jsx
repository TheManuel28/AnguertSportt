import { useEffect, useState } from "react";
import { api } from "../api/client";
import { exportarCsv } from "../utils/exportarCsv";

function formatearFecha(fecha) {
  if (!fecha) return "-";
  const ms = fecha._seconds ? fecha._seconds * 1000 : Date.parse(fecha);
  if (Number.isNaN(ms)) return "-";
  return new Date(ms).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" });
}

const REPORTES = [
  { id: "inventario", etiqueta: "Inventario general" },
  { id: "movimientos", etiqueta: "Movimientos" },
  { id: "stock-bajo", etiqueta: "Stock bajo" },
  { id: "agotados", etiqueta: "Agotados" },
];

export default function AdminReportes() {
  const [tabActiva, setTabActiva] = useState("inventario");
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [tipoMovimiento, setTipoMovimiento] = useState("");

  async function cargarInventarioGeneral() {
    const productos = await api.get("/reportes/inventario-general");
    const filasPlanas = [];
    for (const p of productos) {
      if (!p.variantes || p.variantes.length === 0) {
        filasPlanas.push({
          Código: p.codigo,
          Producto: p.nombre,
          Categoría: p.categoriaNombre,
          Talla: "-",
          Color: "-",
          SKU: "-",
          "Precio (S/)": p.precioVenta,
          Stock: p.stockTotal ?? 0,
          "Stock mínimo": "-",
          Estado: "-",
        });
      } else {
        for (const v of p.variantes) {
          filasPlanas.push({
            Código: p.codigo,
            Producto: p.nombre,
            Categoría: p.categoriaNombre,
            Talla: v.talla,
            Color: v.color,
            SKU: v.codigoSku,
            "Precio (S/)": p.precioVenta,
            Stock: v.stockActual,
            "Stock mínimo": v.stockMinimo,
            Estado: v.estadoStock,
          });
        }
      }
    }
    return filasPlanas;
  }

  async function cargarMovimientos() {
    const query = new URLSearchParams();
    if (desde) query.set("desde", desde);
    if (hasta) query.set("hasta", hasta);
    if (tipoMovimiento) query.set("tipo", tipoMovimiento);
    const movimientos = await api.get(`/reportes/movimientos?${query.toString()}`);
    return movimientos.map((m) => ({
      Fecha: formatearFecha(m.fecha),
      Tipo: m.tipo,
      Producto: m.productoNombre,
      Talla: m.talla,
      Color: m.color,
      Cantidad: m.cantidad,
      "Stock anterior": m.stockAnterior,
      "Stock resultante": m.stockResultante,
      Motivo: m.motivo,
      Usuario: m.usuarioNombre,
    }));
  }

  async function cargarCriticos(endpoint) {
    const variantes = await api.get(`/reportes/${endpoint}`);
    return variantes.map((v) => ({
      Producto: v.productoNombre,
      Talla: v.talla,
      Color: v.color,
      SKU: v.codigoSku,
      Stock: v.stockActual,
      "Stock mínimo": v.stockMinimo,
      Estado: v.estadoStock,
    }));
  }

  async function cargarReporte(tab) {
    setCargando(true);
    setError("");
    try {
      let datos = [];
      if (tab === "inventario") datos = await cargarInventarioGeneral();
      if (tab === "movimientos") datos = await cargarMovimientos();
      if (tab === "stock-bajo") datos = await cargarCriticos("stock-bajo");
      if (tab === "agotados") datos = await cargarCriticos("agotados");
      setFilas(datos);
    } catch (err) {
      setError(err.message);
      setFilas([]);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarReporte(tabActiva);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabActiva]);

  function descargar() {
    const nombre = `${tabActiva}-angher-sport-${new Date().toISOString().slice(0, 10)}.csv`;
    exportarCsv(nombre, filas);
  }

  const columnas = filas.length > 0 ? Object.keys(filas[0]) : [];
  const etiquetaActiva = REPORTES.find((r) => r.id === tabActiva)?.etiqueta;

  return (
    <div className="admin-reportes">
      <h1>Reportes</h1>

      <div className="tabs-reportes">
        {REPORTES.map((r) => (
          <button
            key={r.id}
            type="button"
            className={`tab-reporte ${tabActiva === r.id ? "activo" : ""}`}
            onClick={() => setTabActiva(r.id)}
          >
            {r.etiqueta}
          </button>
        ))}
      </div>

      {tabActiva === "movimientos" && (
        <div className="panel filtros-reporte">
          <label>
            Desde
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </label>
          <label>
            Hasta
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </label>
          <label>
            Tipo
            <select value={tipoMovimiento} onChange={(e) => setTipoMovimiento(e.target.value)}>
              <option value="">Todos</option>
              <option value="ENTRADA">Entradas</option>
              <option value="SALIDA">Salidas</option>
              <option value="AJUSTE">Ajustes</option>
            </select>
          </label>
          <button
            type="button"
            className="boton-primario"
            onClick={() => cargarReporte("movimientos")}
          >
            Generar
          </button>
        </div>
      )}

      {error && <div className="aviso aviso-error">{error}</div>}

      <div className="panel">
        <div className="panel-encabezado">
          <h2>
            {etiquetaActiva} ({filas.length})
          </h2>
          <button
            type="button"
            className="boton-primario"
            onClick={descargar}
            disabled={filas.length === 0}
          >
            ⬇ Descargar CSV
          </button>
        </div>

        {cargando && <p>Cargando...</p>}
        {!cargando && filas.length === 0 && <p>No hay datos para este reporte.</p>}

        {!cargando && filas.length > 0 && (
          <div className="tabla-reporte-wrapper">
            <table className="tabla-reporte">
              <thead>
                <tr>
                  {columnas.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filas.slice(0, 50).map((fila, i) => (
                  <tr key={i}>
                    {columnas.map((c) => (
                      <td key={c}>{String(fila[c])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {filas.length > 50 && (
              <p className="texto-ayuda">
                Mostrando 50 de {filas.length} filas en pantalla — el CSV descargado trae todas.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}