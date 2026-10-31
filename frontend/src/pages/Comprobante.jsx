import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";

const soles = (n) => `S/ ${Number(n ?? 0).toFixed(2)}`;

function formatearFecha(f) {
  if (!f) return "-";
  const ms = f._seconds ? f._seconds * 1000 : Date.parse(f);
  if (Number.isNaN(ms)) return "-";
  return new Date(ms).toLocaleString("es-PE", { dateStyle: "long", timeStyle: "short" });
}

export default function Comprobante() {
  const { id } = useParams();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/pedidos/${id}/comprobante`)
      .then(setDatos)
      .catch((e) => setError(e.message || "No se pudo cargar el comprobante"));
  }, [id]);

  if (error) {
    return (
      <div className="comprobante-pagina">
        <p className="aviso aviso-error">{error}</p>
        <Link to="/mis-pedidos">Volver a mis pedidos</Link>
      </div>
    );
  }
  if (!datos) return <p style={{ padding: "2rem" }}>Cargando comprobante...</p>;

  return (
    <div className="comprobante-pagina">
      <div className="comprobante-acciones no-imprimir">
        <button type="button" className="boton-primario" onClick={() => window.print()}>
          Imprimir o guardar como PDF
        </button>
        <Link to="/mis-pedidos">Volver</Link>
      </div>

      <article className="comprobante-hoja">
        <header className="comprobante-cabecera">
          <div>
            <h1>{datos.tienda.nombre}</h1>
            {datos.tienda.direccion && <p>{datos.tienda.direccion}</p>}
            {datos.tienda.telefono && <p>Tel./WhatsApp: {datos.tienda.telefono}</p>}
          </div>
          <div className="comprobante-numero">
            <strong>COMPROBANTE DE PEDIDO</strong>
            <span>N° {datos.numero}</span>
            <small>Emitido: {formatearFecha(datos.emitidoEn)}</small>
          </div>
        </header>

        <section className="comprobante-bloque">
          <div>
            <b>Cliente:</b> {datos.cliente.nombre || "-"}
          </div>
          {datos.cliente.email && (
            <div>
              <b>Correo:</b> {datos.cliente.email}
            </div>
          )}
          <div>
          <b>N.º de pedido:</b> {datos.numero}
           </div>
              <div>
           <b>ID de pedido:</b> {datos.idPedido}
          </div>
        </section>

        <table className="comprobante-tabla">
          <thead>
            <tr>
              <th>Descripción</th>
              <th>Cant.</th>
              <th>P. unit.</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {datos.items.map((it, i) => (
              <tr key={i}>
                <td>
                  {it.productoNombre} ({it.talla}/{it.color})
                </td>
                <td>{it.cantidad}</td>
                <td>{soles(it.precioUnitario)}</td>
                <td>{soles(it.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <section className="comprobante-totales">
          <div>
            <span>Total del pedido</span>
            <b>{soles(datos.total)}</b>
          </div>
          <div>
            <span>Pago inicial recibido (50%)</span>
            <b>{soles(datos.pagoInicial)}</b>
          </div>
          <div className="comprobante-saldo">
            <span>Saldo por pagar al recibir</span>
            <b>{soles(datos.pagoRestante)}</b>
          </div>
        </section>

        <section className="comprobante-bloque">
          <div>
            <b>Medio de pago:</b> {datos.pago.metodo}
            {datos.pago.numeroOperacion && <> · Operación N° {datos.pago.numeroOperacion}</>}
          </div>
          <div>
            <b>Pago confirmado:</b> {formatearFecha(datos.pago.confirmadoEn)}
          </div>
          {datos.estadoPedido === "CANCELADO" && <div className="comprobante-cancelado">PEDIDO CANCELADO</div>}
        </section>

        <footer className="comprobante-leyenda">{datos.leyenda}</footer>
      </article>
    </div>
  );
}