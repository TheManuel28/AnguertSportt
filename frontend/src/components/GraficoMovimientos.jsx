// Gráfico de barras agrupadas (entradas vs salidas por día) hecho en SVG
// puro, sin librerías externas. Suficiente para el volumen de datos de un
// proyecto académico; si el dataset crece mucho, conviene migrar a una
// librería como Chart.js o Recharts.
export default function GraficoMovimientos({ serie }) {
  if (!serie || serie.length === 0) {
    return <p>No hay movimientos registrados en los últimos 30 días.</p>;
  }

  const ANCHO = 700;
  const ALTO = 220;
  const PADDING = 32;
  const max = Math.max(1, ...serie.map((d) => Math.max(d.entradas, d.salidas)));
  const anchoDia = (ANCHO - PADDING * 2) / serie.length;

  return (
    <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="grafico-movimientos">
      <line
        x1={PADDING}
        y1={ALTO - PADDING}
        x2={ANCHO - PADDING}
        y2={ALTO - PADDING}
        stroke="#ccc"
      />
      {serie.map((dia, i) => {
        const x = PADDING + i * anchoDia;
        const altoEntrada = ((ALTO - PADDING * 2) * dia.entradas) / max;
        const altoSalida = ((ALTO - PADDING * 2) * dia.salidas) / max;
        const mostrarEtiqueta = i % 5 === 0;

        return (
          <g key={dia.fecha}>
            <rect
              x={x + 2}
              y={ALTO - PADDING - altoEntrada}
              width={Math.max(anchoDia / 2 - 3, 1)}
              height={altoEntrada}
              fill="var(--azul, #1c3f94)"
            />
            <rect
              x={x + anchoDia / 2}
              y={ALTO - PADDING - altoSalida}
              width={Math.max(anchoDia / 2 - 3, 1)}
              height={altoSalida}
              fill="var(--amarillo, #f5b400)"
            />
            {mostrarEtiqueta && (
              <text x={x} y={ALTO - 10} fontSize="9" fill="#666">
                {dia.fecha.slice(5)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
