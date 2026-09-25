import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

export default function Catalogo() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [categoriaActiva, setCategoriaActiva] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.get("/productos"), api.get("/categorias")])
      .then(([prods, cats]) => {
        setProductos(prods);
        setCategorias(cats);
      })
      .catch(() => setError("No se pudo cargar el catálogo. ¿Está corriendo el backend?"))
      .finally(() => setCargando(false));
  }, []);

  const productosFiltrados = useMemo(() => {
    if (!categoriaActiva) return productos;
    return productos.filter((p) => p.categoriaId === categoriaActiva);
  }, [productos, categoriaActiva]);

  // Solo muestra en el filtro las categorías que realmente tienen productos
  const categoriasConProductos = useMemo(() => {
    const idsConProductos = new Set(productos.map((p) => p.categoriaId));
    return categorias.filter((c) => idsConProductos.has(c.id));
  }, [productos, categorias]);

  if (cargando) return <p style={{ padding: "2rem" }}>Cargando catálogo...</p>;
  if (error) return <p style={{ padding: "2rem", color: "#c0392b" }}>{error}</p>;

  return (
    <div className="catalogo">
      <h1>Catálogo Angher Sport</h1>

      {categoriasConProductos.length > 0 && (
        <div className="filtro-categorias">
          <button
            type="button"
            className={`chip-categoria ${categoriaActiva === "" ? "activo" : ""}`}
            onClick={() => setCategoriaActiva("")}
          >
            Todos
          </button>
          {categoriasConProductos.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`chip-categoria ${categoriaActiva === c.id ? "activo" : ""}`}
              onClick={() => setCategoriaActiva(c.id)}
            >
              {c.nombre}
            </button>
          ))}
        </div>
      )}

      {productos.length === 0 && (
        <div className="estado-vacio">
          <p>Aún no hay productos registrados.</p>
          <p className="estado-vacio-ayuda">
            Regístralos desde el panel administrativo o directamente con
            <code> POST /api/productos</code>.
          </p>
        </div>
      )}

      {productos.length > 0 && productosFiltrados.length === 0 && (
        <p className="texto-ayuda">No hay productos en esta categoría todavía.</p>
      )}

      <div className="grid-productos">
        {productosFiltrados.map((producto) => (
          <Link key={producto.id} to={`/producto/${producto.id}`} className="tarjeta-producto">
            <div className="tarjeta-producto-imagen">
              {producto.imagenUrl ? (
                <img src={producto.imagenUrl} alt={producto.nombre} />
              ) : (
                <span>{producto.nombre.charAt(0)}</span>
              )}
            </div>
            <h3>{producto.nombre}</h3>
            <p>{producto.categoriaNombre}</p>
            <p>S/ {producto.precioVenta}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}