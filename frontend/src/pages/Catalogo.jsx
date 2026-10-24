import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

const normalizarTexto = (texto) =>
  texto
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export default function Catalogo() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [categoriaActiva, setCategoriaActiva] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [orden, setOrden] = useState("relevancia");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.get("/productos"), api.get("/categorias")])
      .then(([prods, cats]) => {
        setProductos(prods);
        setCategorias(cats);
      })
      .catch(() =>
        setError("No se pudo cargar el catálogo. ¿Está corriendo el backend?")
      )
      .finally(() => setCargando(false));
  }, []);

  const productosFiltrados = useMemo(() => {
    const termino = normalizarTexto(busqueda.trim());

    const resultado = productos.filter((producto) => {
      const coincideCategoria =
        !categoriaActiva || producto.categoriaId === categoriaActiva;

      const textoProducto = normalizarTexto(
        `${producto.nombre || ""} ${producto.categoriaNombre || ""} ${
          producto.descripcion || ""
        }`
      );

      return coincideCategoria && (!termino || textoProducto.includes(termino));
    });

    if (orden === "nombre") {
      return resultado.sort((a, b) =>
        a.nombre.localeCompare(b.nombre, "es")
      );
    }

    if (orden === "precio-menor") {
      return resultado.sort(
        (a, b) => Number(a.precioVenta) - Number(b.precioVenta)
      );
    }

    if (orden === "precio-mayor") {
      return resultado.sort(
        (a, b) => Number(b.precioVenta) - Number(a.precioVenta)
      );
    }

    return resultado;
  }, [productos, categoriaActiva, busqueda, orden]);

  const categoriasConProductos = useMemo(() => {
    const idsConProductos = new Set(productos.map((producto) => producto.categoriaId));
    return categorias.filter((categoria) => idsConProductos.has(categoria.id));
  }, [productos, categorias]);

  if (cargando) {
    return <p style={{ padding: "2rem" }}>Cargando catálogo...</p>;
  }

  if (error) {
    return <p style={{ padding: "2rem", color: "#c0392b" }}>{error}</p>;
  }

  const productoConImagen = productos.find((producto) => producto.imagenUrl);

  return (
    <div className="catalogo">
      <section className="catalogo-portada" aria-labelledby="catalogo-titulo">
        <div className="catalogo-portada-texto">
          <span className="catalogo-portada-etiqueta">
            ANGHER SPORT · PASIÓN POR EL FÚTBOL
          </span>

          <h1 id="catalogo-titulo">Alienta a tu equipo con orgullo</h1>

          <p>
            Encuentra camisetas de clubes y selecciones para llevar tus colores
            a todas partes.
          </p>

          <a className="catalogo-portada-boton" href="#productos">
            Explorar catálogo <span aria-hidden="true">↓</span>
          </a>
        </div>

        <div className="catalogo-portada-visual" aria-hidden="true">
          <div className="catalogo-portada-circulo" />

          {productoConImagen ? (
            <img
              src={productoConImagen.imagenUrl}
              alt=""
              className="catalogo-portada-producto"
            />
          ) : (
            <div className="catalogo-portada-balon">⚽</div>
          )}

          <span className="catalogo-portada-texto-vertical">
            VIVE EL FÚTBOL
          </span>
        </div>

        <div className="catalogo-portada-acento" aria-hidden="true" />
      </section>

      <section
        className="catalogo-tienda"
        id="productos"
        aria-labelledby="productos-titulo"
      >
        <div className="catalogo-encabezado-tienda">
          <div>
            <span className="catalogo-sobretitulo">
              ENCUENTRA TUS COLORES
            </span>
            <h2 id="productos-titulo">Nuestro catálogo</h2>
          </div>

          <p className="catalogo-total">
            {productosFiltrados.length}{" "}
            {productosFiltrados.length === 1 ? "producto" : "productos"}
          </p>
        </div>

        {productos.length > 0 && (
          <>
            <div className="catalogo-controles">
              <label className="catalogo-busqueda">
                <span className="catalogo-busqueda-icono" aria-hidden="true">
                  ⌕
                </span>

                <span className="sr-only">Buscar productos</span>

                <input
                  type="search"
                  value={busqueda}
                  onChange={(evento) => setBusqueda(evento.target.value)}
                  placeholder="Busca tu club o selección"
                />

                {busqueda && (
                  <button
                    type="button"
                    onClick={() => setBusqueda("")}
                    aria-label="Limpiar búsqueda"
                  >
                    ×
                  </button>
                )}
              </label>

              <label className="catalogo-orden">
                <span>Ordenar por</span>

                <select
                  value={orden}
                  onChange={(evento) => setOrden(evento.target.value)}
                >
                  <option value="relevancia">Orden original</option>
                  <option value="nombre">Nombre</option>
                  <option value="precio-menor">Precio: menor a mayor</option>
                  <option value="precio-mayor">Precio: mayor a menor</option>
                </select>
              </label>
            </div>

            {categoriasConProductos.length > 0 && (
              <div
                className="filtro-categorias"
                aria-label="Filtrar por categoría"
              >
                <button
                  type="button"
                  className={`chip-categoria ${
                    categoriaActiva === "" ? "activo" : ""
                  }`}
                  aria-pressed={categoriaActiva === ""}
                  onClick={() => setCategoriaActiva("")}
                >
                  Todos
                </button>

                {categoriasConProductos.map((categoria) => (
                  <button
                    key={categoria.id}
                    type="button"
                    className={`chip-categoria ${
                      categoriaActiva === categoria.id ? "activo" : ""
                    }`}
                    aria-pressed={categoriaActiva === categoria.id}
                    onClick={() => setCategoriaActiva(categoria.id)}
                  >
                    {categoria.nombre}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {productos.length === 0 && (
          <div className="estado-vacio">
            <p>Aún no hay productos registrados.</p>
            <p className="estado-vacio-ayuda">
              Regístralos desde el panel administrativo o directamente con{" "}
              <code>POST /api/productos</code>.
            </p>
          </div>
        )}

        {productos.length > 0 && productosFiltrados.length === 0 && (
          <div className="catalogo-sin-resultados">
            <span aria-hidden="true">⌕</span>
            <h3>No encontramos ese producto</h3>
            <p>
              Prueba con otro nombre o cambia los filtros para ver más
              camisetas.
            </p>

            <button
              type="button"
              className="boton-secundario"
              onClick={() => {
                setBusqueda("");
                setCategoriaActiva("");
              }}
            >
              Limpiar búsqueda y filtros
            </button>
          </div>
        )}

        {productosFiltrados.length > 0 && (
          <div className="grid-productos">
            {productosFiltrados.map((producto) => (
              <Link
                key={producto.id}
                to={`/producto/${producto.id}`}
                className="tarjeta-producto"
              >
                <div className="tarjeta-producto-imagen">
                  {producto.imagenUrl ? (
                    <img
                      src={producto.imagenUrl}
                      alt={producto.nombre}
                      loading="lazy"
                    />
                  ) : (
                    <span>{producto.nombre.charAt(0)}</span>
                  )}
                </div>

                <div className="tarjeta-producto-info">
                  <p className="tarjeta-producto-categoria">
                    {producto.categoriaNombre}
                  </p>

                  <h3>{producto.nombre}</h3>

                  <div className="tarjeta-producto-pie">
                    <p>S/ {Number(producto.precioVenta).toFixed(2)}</p>
                    <span aria-hidden="true">↗</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}