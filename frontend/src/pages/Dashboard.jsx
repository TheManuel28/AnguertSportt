import { useEffect, useState } from "react";
import { api } from "../api/client";
import TarjetaKPI from "../components/TarjetaKPI";
import GraficoMovimientos from "../components/GraficoMovimientos";

export default function Dashboard() {
  const [resumen, setResumen] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/dashboard/resumen")
      .then(setResumen)
      .catch(() =>
        setError(
          "No se pudo cargar el dashboard. Verifica que el backend esté corriendo y que tu usuario tenga rol administrador o almacenero."
        )
      )
      .finally(() => setCargando(false));
  }, []);

  if (cargando) return <p style={{ padding: "2rem" }}>Cargando dashboard...</p>;
  if (error) return <p style={{ padding: "2rem", color: "#c0392b" }}>{error}</p>;

  const { totales, serieMovimientos, topSalidas, entradasRecientes, salidasRecientes, alertasActivas } =
    resumen;

  return (
    <div className="dashboard">
      <h1>Panel administrativo</h1>

      <div className="kpi-grid">
        <TarjetaKPI titulo="Productos activos" valor={totales.productos} />
        <TarjetaKPI titulo="Stock normal" valor={totales.stockNormal} tono="normal" />
        <TarjetaKPI titulo="Stock bajo" valor={totales.stockBajo} tono="bajo" />
        <TarjetaKPI titulo="Agotados" valor={totales.stockAgotado} tono="agotado" />
      </div>

      <section>
        <h2>Movimientos (últimos 30 días)</h2>
        <div className="leyenda-grafico">
          <span><i className="punto azul" /> Entradas</span>
          <span><i className="punto amarillo" /> Salidas</span>
        </div>
        <GraficoMovimientos serie={serieMovimientos} />
      </section>

      <section className="dos-columnas">
        <div>
          <h2>Top 5 productos con más salidas</h2>
          {topSalidas.length === 0 && <p>Sin salidas registradas todavía.</p>}
          <ol>
            {topSalidas.map((p) => (
              <li key={p.productoNombre}>
                {p.productoNombre} — {p.cantidad} unidades
              </li>
            ))}
          </ol>
        </div>

        <div>
          <h2>Alertas activas</h2>
          {alertasActivas.length === 0 && <p>Sin alertas por ahora.</p>}
          <ul className="lista-alertas">
            {alertasActivas.map((v) => (
              <li key={v.id} className={`alerta-${v.estadoStock.toLowerCase()}`}>
                {v.productoNombre} ({v.talla}/{v.color}) —{" "}
                {v.estadoStock === "AGOTADO" ? "agotado" : `stock bajo (${v.stockActual})`}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="dos-columnas">
        <div>
          <h2>Entradas recientes</h2>
          {entradasRecientes.length === 0 && <p>Sin entradas recientes.</p>}
          <ul>
            {entradasRecientes.map((m) => (
              <li key={m.id}>
                {m.productoNombre} ({m.talla}/{m.color}) +{m.cantidad}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2>Salidas recientes</h2>
          {salidasRecientes.length === 0 && <p>Sin salidas recientes.</p>}
          <ul>
            {salidasRecientes.map((m) => (
              <li key={m.id}>
                {m.productoNombre} ({m.talla}/{m.color}) -{m.cantidad}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
