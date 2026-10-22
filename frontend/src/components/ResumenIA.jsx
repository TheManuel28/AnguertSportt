import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";

const ICONO = { positivo: "↗", alerta: "!", neutro: "•" };

export default function ResumenIA() {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargar = useCallback((forzar = false) => {
    setCargando(true);
    setError("");
    api
      .get(`/dashboard/resumen-ia${forzar ? "?refrescar=1" : ""}`)
      .then(setDatos)
      .catch((err) => setError(err.message || "No se pudo generar el resumen con IA."))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    cargar(false);
  }, [cargar]);

  const hora = datos?.generadoEn
    ? new Date(datos.generadoEn).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <section className="resumen-ia">
      <header className="resumen-ia-cabecera">
        <div className="resumen-ia-titulo">
          <span className="resumen-ia-icono">✦</span>
          <h2>Resumen inteligente</h2>
          <span className="resumen-ia-etiqueta">IA</span>
        </div>
        <div className="resumen-ia-acciones">
          {hora && !cargando && <span className="resumen-ia-hora">Actualizado {hora}</span>}
          <button
            type="button"
            className="resumen-ia-boton"
            onClick={() => cargar(true)}
            disabled={cargando}
          >
            {cargando ? "Analizando..." : "↻ Actualizar"}
          </button>
        </div>
      </header>

      {cargando && !datos && (
        <div className="resumen-ia-esqueleto" aria-busy="true">
          <div className="barra barra-larga" />
          <div className="barra" />
          <div className="barra barra-corta" />
        </div>
      )}

        {error && <p className="resumen-ia-error">{error}</p>}

      {datos?.desactualizado && !cargando && !error && (
        <p className="resumen-ia-aviso">
          La IA está saturada en este momento. Mostrando el último análisis disponible.
        </p>
      )}

      {datos && (
        <div className={cargando ? "resumen-ia-cuerpo cargando" : "resumen-ia-cuerpo"}>
          <p className="resumen-ia-frase">{datos.resumen}</p>

          {datos.hallazgos.length > 0 && (
            <ul className="resumen-ia-hallazgos">
              {datos.hallazgos.map((h, i) => (
                <li key={i} className={`hallazgo hallazgo-${h.tipo}`}>
                  <span className="hallazgo-icono">{ICONO[h.tipo]}</span>
                  <span>{h.texto}</span>
                </li>
              ))}
            </ul>
          )}

          {datos.recomendaciones.length > 0 && (
            <div className="resumen-ia-recomendaciones">
              <h3>Recomendaciones</h3>
              <ol>
                {datos.recomendaciones.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </section>
  );
}