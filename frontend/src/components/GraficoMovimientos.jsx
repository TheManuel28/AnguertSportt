// Gráfico de barras agrupadas (entradas vs salidas por día) hecho en SVG puro,
// sin librerías externas. El backend solo devuelve los días que tuvieron
// movimientos, así que aquí se completa el eje con los últimos 30 días (los
// días sin movimiento valen 0). Si no se hiciera, con 1 o 2 días de datos
// cada barra ocuparía media pantalla.
const DIAS_VENTANA = 30;

const ANCHO = 1000;
const ALTO = 270;
const MARGEN = { arriba: 24, derecha: 16, abajo: 34, izquierda: 44 };

const COLOR_ENTRADA = "var(--grafico-entrada, #4c8dff)";
const COLOR_SALIDA = "var(--grafico-salida, var(--amarillo, #f5b400))";
const COLOR_TEXTO = "var(--color-texto-suave, #9aa0ad)";
const COLOR_GRILLA = "var(--color-borde, #2b3142)";

// Misma forma de calcular el día que usa el backend (inicio de día local -> YYYY-MM-DD)
function claveDia(diasAtras) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - diasAtras);
  return d.toISOString().slice(0, 10);
}

function formatearDia(clave) {
  const [, mes, dia] = clave.split("-");
  return `${dia}/${mes}`;
}

// Elige una escala "redonda" (1, 2, 5, 10, 20, 50...) con ~4 divisiones
function escalaBonita(max) {
  const bruto = max / 4;
  const potencia = Math.pow(10, Math.floor(Math.log10(bruto)));
  const f = bruto / potencia;
  const base = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  const paso = Math.max(1, base * potencia);
  return { paso, tope: Math.ceil(max / paso) * paso };
}

export default function GraficoMovimientos({ serie }) {
  if (!serie || serie.length === 0) {
    return <p>No hay movimientos registrados en los últimos 30 días.</p>;
  }

  // 1) Eje completo de días: últimos 30 + cualquier día extra que venga del backend
  const porFecha = new Map(serie.map((d) => [d.fecha, d]));
  const claves = new Set(porFecha.keys());
  for (let k = 0; k <= DIAS_VENTANA; k++) claves.add(claveDia(k));
  const dias = [...claves]
    .sort()
    .map((fecha) => ({
      fecha,
      entradas: porFecha.get(fecha)?.entradas ?? 0,
      salidas: porFecha.get(fecha)?.salidas ?? 0,
    }));

  // 2) Geometría
  const max = Math.max(1, ...dias.map((d) => Math.max(d.entradas, d.salidas)));
  const { paso, tope } = escalaBonita(max);
  const areaAncho = ANCHO - MARGEN.izquierda - MARGEN.derecha;
  const areaAlto = ALTO - MARGEN.arriba - MARGEN.abajo;
  const base = ALTO - MARGEN.abajo;
  const anchoDia = areaAncho / dias.length;
  const anchoBarra = Math.min(anchoDia * 0.36, 16);
  const yDe = (valor) => base - (areaAlto * valor) / tope;

  const marcas = [];
  for (let v = 0; v <= tope; v += paso) marcas.push(v);

  // 3) Qué fechas se rotulan: cada 5 días contando desde hoy + los días con datos
  const mostrar = new Set();
  dias.forEach((_, i) => {
    if ((dias.length - 1 - i) % 5 === 0) mostrar.add(i);
  });
  dias.forEach((d, i) => {
    if (d.entradas + d.salidas === 0) return;
    const hayCerca = [...mostrar].some((j) => Math.abs(j - i) <= 2);
    if (!hayCerca) mostrar.add(i);
  });

  return (
    <svg
      viewBox={`0 0 ${ANCHO} ${ALTO}`}
      className="grafico-movimientos"
      role="img"
      aria-label="Entradas y salidas de inventario por día, últimos 30 días"
    >
      {marcas.map((v) => (
        <g key={v}>
          <line
            x1={MARGEN.izquierda}
            x2={ANCHO - MARGEN.derecha}
            y1={yDe(v)}
            y2={yDe(v)}
            stroke={COLOR_GRILLA}
            strokeDasharray={v === 0 ? undefined : "3 4"}
          />
          <text x={MARGEN.izquierda - 8} y={yDe(v) + 4} fontSize="11" textAnchor="end" fill={COLOR_TEXTO}>
            {v}
          </text>
        </g>
      ))}

      {dias.map((dia, i) => {
        const centro = MARGEN.izquierda + i * anchoDia + anchoDia / 2;
        const hEntrada = base - yDe(dia.entradas);
        const hSalida = base - yDe(dia.salidas);

        return (
          <g key={dia.fecha}>
            <title>{`${formatearDia(dia.fecha)}: ${dia.entradas} entradas, ${dia.salidas} salidas`}</title>
            {/* zona invisible para que el tooltip aparezca al pasar por todo el día */}
            <rect x={centro - anchoDia / 2} y={MARGEN.arriba} width={anchoDia} height={areaAlto} fill="transparent" />

            {dia.entradas > 0 && (
              <>
                <rect x={centro - anchoBarra - 1} y={yDe(dia.entradas)} width={anchoBarra} height={hEntrada} rx="2" fill={COLOR_ENTRADA} />
                <text x={centro - anchoBarra / 2 - 1} y={yDe(dia.entradas) - 5} fontSize="11" fontWeight="600" textAnchor="middle" fill={COLOR_ENTRADA}>
                  {dia.entradas}
                </text>
              </>
            )}
            {dia.salidas > 0 && (
              <>
                <rect x={centro + 1} y={yDe(dia.salidas)} width={anchoBarra} height={hSalida} rx="2" fill={COLOR_SALIDA} />
                <text x={centro + anchoBarra / 2 + 1} y={yDe(dia.salidas) - 5} fontSize="11" fontWeight="600" textAnchor="middle" fill={COLOR_SALIDA}>
                  {dia.salidas}
                </text>
              </>
            )}

            {mostrar.has(i) && (
              <text x={centro} y={ALTO - 12} fontSize="11" textAnchor="middle" fill={COLOR_TEXTO}>
                {formatearDia(dia.fecha)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}