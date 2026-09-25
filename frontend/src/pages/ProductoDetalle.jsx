import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api/client";
import { useCart } from "../context/CartContext";

export default function ProductoDetalle() {
  const { id } = useParams();
  const { agregarItem } = useCart();

  const [producto, setProducto] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [varianteId, setVarianteId] = useState("");
  const [cantidad, setCantidad] = useState(1);

  useEffect(() => {
    api
      .get(`/productos/${id}`)
      .then((data) => {
        setProducto(data);
        const primeraDisponible = data.variantes?.find((v) => v.stockActual > 0);
        setVarianteId(primeraDisponible?.id || "");
      })
      .catch(() => setError("No se pudo cargar el producto"))
      .finally(() => setCargando(false));
  }, [id]);

  if (cargando) return <p style={{ padding: "2rem" }}>Cargando producto...</p>;
  if (error && !producto) return <p style={{ padding: "2rem", color: "#c0392b" }}>{error}</p>;
  if (!producto) return null;

  const variante = producto.variantes?.find((v) => v.id === varianteId);

  function agregarAlCarrito() {
    setError("");
    if (!variante) {
      setError("Selecciona una talla/color disponible");
      return;
    }
    if (cantidad > variante.stockActual) {
      setError(`Solo hay ${variante.stockActual} unidades disponibles`);
      return;
    }
    agregarItem({
      varianteId: variante.id,
      productoNombre: producto.nombre,
      talla: variante.talla,
      color: variante.color,
      precioUnitario: producto.precioVenta,
      cantidad: Number(cantidad),
    });
    setMensaje("Se agregó al carrito");
    setTimeout(() => setMensaje(""), 2500);
  }

  return (
    <div className="producto-detalle">
      <Link to="/" className="volver-catalogo">
        ← Volver al catálogo
      </Link>

      <div className="producto-detalle-grid">
        <div className="producto-detalle-imagen">
          <span>{producto.nombre.charAt(0)}</span>
        </div>

        <div className="producto-detalle-imagen">
        {producto.imagenUrl ? (
        <img src={producto.imagenUrl} alt={producto.nombre} />
        ) : (
       <span>{producto.nombre.charAt(0)}</span>
       )}
      </div>

        <div>
          <p className="producto-detalle-categoria">{producto.categoriaNombre}</p>
          <h1>{producto.nombre}</h1>
          <p className="producto-detalle-precio">S/ {producto.precioVenta}</p>
          {producto.descripcion && (
            <p className="producto-detalle-descripcion">{producto.descripcion}</p>
          )}

          {mensaje && <div className="aviso aviso-exito">{mensaje}</div>}
          {error && <div className="aviso aviso-error">{error}</div>}

          {(!producto.variantes || producto.variantes.length === 0) && (
            <p>Este producto todavía no tiene tallas/colores disponibles.</p>
          )}

          {producto.variantes && producto.variantes.length > 0 && (
            <>
              <p className="etiqueta-seccion">Talla / color</p>
              <div className="selector-variantes">
                {producto.variantes.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    disabled={v.stockActual <= 0}
                    className={`chip-variante ${varianteId === v.id ? "activo" : ""}`}
                    onClick={() => setVarianteId(v.id)}
                  >
                    {v.talla} / {v.color}
                    {v.stockActual <= 0 && <span className="agotado-tag"> agotado</span>}
                  </button>
                ))}
              </div>

              {variante && <p className="texto-ayuda">Stock disponible: {variante.stockActual}</p>}

              <label className="campo campo-cantidad">
                <span>Cantidad</span>
                <input
                  type="number"
                  min="1"
                  max={variante?.stockActual || 1}
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                />
              </label>

              <button
                type="button"
                className="boton-primario"
                onClick={agregarAlCarrito}
                disabled={!variante || variante.stockActual <= 0}
              >
                Agregar al carrito
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}