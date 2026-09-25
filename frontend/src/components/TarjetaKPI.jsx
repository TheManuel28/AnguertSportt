export default function TarjetaKPI({ titulo, valor, tono = "normal" }) {
  return (
    <div className={`tarjeta-kpi tono-${tono}`}>
      <p className="tarjeta-kpi-titulo">{titulo}</p>
      <p className="tarjeta-kpi-valor">{valor}</p>
    </div>
  );
}
