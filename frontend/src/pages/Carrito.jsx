import { useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import PagoYape from "../components/PagoYape";

export default function Carrito() {
  const { items, actualizarCantidad, quitarItem, vaciarCarrito, totalPrecio } = useCart();
  const { usuario } = useAuth();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [pedidoConfirmado, setPedidoConfirmado] = useState(null);

  const pagoInicial = Math.round(totalPrecio * 0.5 * 100) / 100;
  const pagoRestante = totalPrecio - pagoInicial;

  async function confirmarPedido() {
    setError("");
    setEnviando(true);
    try {
      const pedido = await api.post("/pedidos", {
        items: items.map((i) => ({ varianteId: i.varianteId, cantidad: i.cantidad })),
      });
      setPedidoConfirmado(pedido);
      vaciarCarrito();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  if (pedidoConfirmado) {
    return (
      <div className="carrito">
        <div className="panel confirmacion-pedido">
          <h1>¡Pedido registrado!</h1>
          <p>Tu pedido quedó guardado con el siguiente resumen:</p>
          <ul className="resumen-pedido">
            <li>
              Total: <strong>S/ {pedidoConfirmado.total.toFixed(2)}</strong>
            </li>
            <li>
              Pago inicial (50%): <strong>S/ {pedidoConfirmado.pagoInicial.toFixed(2)}</strong>
            </li>
            <li>Pago restante al recibir: S/ {pedidoConfirmado.pagoRestante.toFixed(2)}</li>
          </ul>
          <PagoYape pedido={pedidoConfirmado} onActualizado={setPedidoConfirmado} />
          <div className="acciones-confirmacion">
            <Link to="/mis-pedidos" className="boton-primario">
              Ver mis pedidos
            </Link>
            <Link to="/">Seguir comprando</Link>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="carrito">
        <h1>Tu carrito</h1>
        <div className="estado-vacio">
          <p>Todavía no agregaste productos.</p>
          <Link to="/">Ir al catálogo</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="carrito">
      <h1>Tu carrito</h1>

      {error && <div className="aviso aviso-error">{error}</div>}

      <div className="panel">
        <div className="tabla-carrito">
          {items.map((item) => (
            <div key={item.varianteId} className="fila-carrito">
              <span className="col-producto">
                {item.productoNombre}{" "}
                <small>
                  ({item.talla}/{item.color})
                </small>
              </span>
              <span>S/ {item.precioUnitario}</span>
              <input
                type="number"
                min="1"
                value={item.cantidad}
                onChange={(e) => actualizarCantidad(item.varianteId, Number(e.target.value))}
              />
              <span>S/ {(item.precioUnitario * item.cantidad).toFixed(2)}</span>
              <button
                type="button"
                className="enlace-boton"
                onClick={() => quitarItem(item.varianteId)}
              >
                Quitar
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="panel resumen-carrito">
        <div className="fila-resumen">
          <span>Total del pedido</span>
          <strong>S/ {totalPrecio.toFixed(2)}</strong>
        </div>
        <div className="fila-resumen">
          <span>Pago inicial (50%)</span>
          <strong>S/ {pagoInicial.toFixed(2)}</strong>
        </div>
        <div className="fila-resumen texto-ayuda">
          <span>Pago restante al recibir</span>
          <span>S/ {pagoRestante.toFixed(2)}</span>
        </div>

        {usuario ? (
          <button
            type="button"
            className="boton-primario"
            onClick={confirmarPedido}
            disabled={enviando}
          >
            {enviando ? "Enviando pedido..." : "Confirmar pedido"}
          </button>
        ) : (
          <div className="aviso aviso-error">
            Necesitas una cuenta para confirmar tu pedido. <Link to="/login">Inicia sesión</Link>{" "}
            o <Link to="/registro">regístrate</Link>.
          </div>
        )}
      </div>
    </div>
  );
}