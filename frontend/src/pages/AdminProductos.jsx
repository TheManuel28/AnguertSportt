import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useTiempoReal } from "../hooks/useTiempoReal";
const ESTADO_INICIAL_PRODUCTO = {
  codigo: "",
  nombre: "",
  categoriaId: "",
  descripcion: "",
  precioVenta: "",
  imagenUrl: "",
};

const ESTADO_INICIAL_VARIANTE = {
  codigoSku: "",
  talla: "",
  color: "",
  stockInicial: "",
  stockMinimo: "",
};

export default function AdminProductos() {
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [imagenesDisponibles, setImagenesDisponibles] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [formProducto, setFormProducto] = useState(ESTADO_INICIAL_PRODUCTO);
  const [nuevaCategoria, setNuevaCategoria] = useState("");
  const [mostrarNuevaCategoria, setMostrarNuevaCategoria] = useState(false);

  const [productoExpandido, setProductoExpandido] = useState(null);
  const [detalleProducto, setDetalleProducto] = useState(null);
  const [formVariante, setFormVariante] = useState(ESTADO_INICIAL_VARIANTE);
  const [imagenEditando, setImagenEditando] = useState("");

  async function cargarDatos() {
    setCargando(true);
    setError("");
    try {
      const [cats, prods, imagenes] = await Promise.all([
        api.get("/categorias"),
        api.get("/productos"),
        api.get("/productos/imagenes-disponibles"),
      ]);
      setCategorias(cats);
      setProductos(prods);
      setImagenesDisponibles(imagenes);
    } catch (err) {
      setError(err.message || "No se pudo cargar la información");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarDatos();
  }, []);
    // Tiempo real: el stock total de cada producto se actualiza solo
  useTiempoReal(["productos", "variantes"], () => {
    api.get("/productos").then(setProductos).catch(() => {});
  });

  function mostrarMensaje(texto) {
    setMensaje(texto);
    setTimeout(() => setMensaje(""), 3000);
  }

  async function crearCategoria(e) {
    e.preventDefault();
    if (!nuevaCategoria.trim()) return;
    try {
      const categoria = await api.post("/categorias", { nombre: nuevaCategoria });
      setCategorias((prev) => [...prev, categoria]);
      setFormProducto((prev) => ({ ...prev, categoriaId: categoria.id }));
      setNuevaCategoria("");
      setMostrarNuevaCategoria(false);
      mostrarMensaje(`Categoría "${categoria.nombre}" creada`);
    } catch (err) {
      setError(err.message);
    }
  }

  async function crearProducto(e) {
    e.preventDefault();
    setError("");
    const categoria = categorias.find((c) => c.id === formProducto.categoriaId);
    if (!categoria) {
      setError("Selecciona una categoría antes de guardar");
      return;
    }
    try {
      const producto = await api.post("/productos", {
        codigo: formProducto.codigo,
        nombre: formProducto.nombre,
        categoriaId: categoria.id,
        categoriaNombre: categoria.nombre,
        descripcion: formProducto.descripcion,
        precioVenta: Number(formProducto.precioVenta),
        imagenUrl: formProducto.imagenUrl.trim(),
      });
      setProductos((prev) => [...prev, producto]);
      setFormProducto(ESTADO_INICIAL_PRODUCTO);
      mostrarMensaje(`Producto "${producto.nombre}" creado`);
    } catch (err) {
      setError(err.message);
    }
  }

  async function abrirDetalle(productoId) {
    if (productoExpandido === productoId) {
      setProductoExpandido(null);
      setDetalleProducto(null);
      return;
    }
    setProductoExpandido(productoId);
    setFormVariante(ESTADO_INICIAL_VARIANTE);
    try {
      const detalle = await api.get(`/productos/${productoId}`);
      setDetalleProducto(detalle);
      setImagenEditando(detalle.imagenUrl || "");
    } catch (err) {
      setError(err.message);
    }
  }

  async function crearVariante(e, productoId) {
    e.preventDefault();
    setError("");
    try {
      const variante = await api.post(`/productos/${productoId}/variantes`, {
        codigoSku: formVariante.codigoSku,
        talla: formVariante.talla,
        color: formVariante.color,
        stockInicial: Number(formVariante.stockInicial || 0),
        stockMinimo: Number(formVariante.stockMinimo || 5),
      });
      setDetalleProducto((prev) => ({
        ...prev,
        variantes: [...(prev?.variantes || []), variante],
      }));
      setProductos((prev) =>
        prev.map((p) =>
          p.id === productoId
            ? { ...p, stockTotal: (p.stockTotal || 0) + variante.stockActual }
            : p
        )
      );
      setFormVariante(ESTADO_INICIAL_VARIANTE);
      mostrarMensaje(`Variante ${variante.talla}/${variante.color} agregada`);
    } catch (err) {
      setError(err.message);
    }
  }

  async function eliminarVariante(productoId, varianteId) {
    if (!window.confirm("¿Eliminar esta variante?")) return;
    setError("");
    const variante = detalleProducto?.variantes?.find((v) => v.id === varianteId);
    try {
      await api.del(`/productos/${productoId}/variantes/${varianteId}`);
      setDetalleProducto((prev) => ({
        ...prev,
        variantes: prev.variantes.filter((v) => v.id !== varianteId),
      }));
      setProductos((prev) =>
        prev.map((p) =>
          p.id === productoId
            ? { ...p, stockTotal: Math.max(0, (p.stockTotal || 0) - (variante?.stockActual || 0)) }
            : p
        )
      );
      mostrarMensaje("Variante eliminada");
    } catch (err) {
      setError(err.message);
    }
  }

  async function guardarImagen(e, productoId) {
    e.preventDefault();
    setError("");
    try {
      const producto = await api.patch(`/productos/${productoId}/imagen`, {
        imagenUrl: imagenEditando.trim(),
      });
      setDetalleProducto((prev) => ({ ...prev, imagenUrl: producto.imagenUrl }));
      setProductos((prev) =>
        prev.map((p) => (p.id === productoId ? { ...p, imagenUrl: producto.imagenUrl } : p))
      );
      mostrarMensaje("Imagen actualizada");
    } catch (err) {
      setError(err.message);
    }
  }

  if (cargando) return <p style={{ padding: "2rem" }}>Cargando productos...</p>;

  return (
    <div className="admin-productos">
      <h1>Gestión de productos</h1>

      {mensaje && <div className="aviso aviso-exito">{mensaje}</div>}
      {error && <div className="aviso aviso-error">{error}</div>}

      <section className="panel">
        <h2>Nuevo producto</h2>
        <form className="formulario-grid" onSubmit={crearProducto}>
          <label>
            Código
            <input
              value={formProducto.codigo}
              onChange={(e) => setFormProducto({ ...formProducto, codigo: e.target.value })}
              placeholder="POL-DRY-001"
              required
            />
          </label>

          <label>
            Nombre
            <input
              value={formProducto.nombre}
              onChange={(e) => setFormProducto({ ...formProducto, nombre: e.target.value })}
              placeholder="Camiseta Real Madrid Local 2026"
              required
            />
          </label>

          <label>
            Categoría
            <div className="categoria-selector">
              <select
                value={formProducto.categoriaId}
                onChange={(e) =>
                  setFormProducto({ ...formProducto, categoriaId: e.target.value })
                }
                required
              >
                <option value="">Selecciona una categoría</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="enlace-boton"
                onClick={() => setMostrarNuevaCategoria((v) => !v)}
              >
                + nueva
              </button>
            </div>
            {mostrarNuevaCategoria && (
              <div className="categoria-nueva">
                <input
                  value={nuevaCategoria}
                  onChange={(e) => setNuevaCategoria(e.target.value)}
                  placeholder='Ej: "Clubes" o "Selecciones"'
                />
                <button type="button" onClick={crearCategoria}>
                  Guardar categoría
                </button>
              </div>
            )}
          </label>

          <label>
            Precio de venta (S/)
            <input
              type="number"
              step="0.01"
              min="0"
              value={formProducto.precioVenta}
              onChange={(e) =>
                setFormProducto({ ...formProducto, precioVenta: e.target.value })
              }
              required
            />
          </label>

          <label className="col-completa">
            Imagen referencial (opcional)
            <div className="selector-imagen">
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    setFormProducto((prev) => ({ ...prev, imagenUrl: e.target.value }));
                  }
                }}
              >
                <option value="">
                  {imagenesDisponibles.length === 0
                    ? "No hay imágenes en frontend/public/productos/"
                    : "Elegir de la carpeta productos/"}
                </option>
                {imagenesDisponibles.map((img) => (
                  <option key={img.ruta} value={img.ruta}>
                    {img.nombre}
                  </option>
                ))}
              </select>
              <input
                value={formProducto.imagenUrl}
                onChange={(e) => setFormProducto({ ...formProducto, imagenUrl: e.target.value })}
                placeholder="o pega una URL externa"
              />
            </div>
            {formProducto.imagenUrl && (
              <img src={formProducto.imagenUrl} alt="Vista previa" className="vista-previa-imagen" />
            )}
            <span className="texto-ayuda">
              El desplegable lista lo que ya subiste a <code>frontend/public/productos/</code>.
              Si aún no tienes el archivo ahí, puedes dejarlo vacío o pegar una URL.
            </span>
          </label>

          <label className="col-completa">
            Descripción
            <textarea
              value={formProducto.descripcion}
              onChange={(e) =>
                setFormProducto({ ...formProducto, descripcion: e.target.value })
              }
              rows={2}
            />
          </label>

          <button type="submit" className="boton-primario col-completa">
            Guardar producto
          </button>
        </form>
      </section>

      <section className="panel">
        <h2>Catálogo ({productos.length})</h2>
        {productos.length === 0 && <p>Todavía no registraste ningún producto.</p>}

        <div className="tabla-productos">
          {productos.map((producto) => (
            <div key={producto.id} className="fila-producto">
              <button
                type="button"
                className="fila-producto-resumen"
                onClick={() => abrirDetalle(producto.id)}
              >
                <span className="fila-producto-imagen">
                  {producto.imagenUrl ? (
                    <img src={producto.imagenUrl} alt={producto.nombre} />
                  ) : (
                    <span className="fila-producto-imagen-letra">
                      {producto.nombre.charAt(0)}
                    </span>
                  )}
                </span>
                <span className="fila-producto-nombre">{producto.nombre}</span>
                <span className="fila-producto-meta">{producto.categoriaNombre}</span>
                <span className="fila-producto-meta">S/ {producto.precioVenta}</span>
                <span className="fila-producto-stock">Stock: {producto.stockTotal ?? 0}</span>
                <span className="fila-producto-flecha">
                  {productoExpandido === producto.id ? "▲" : "▼"}
                </span>
              </button>

              {productoExpandido === producto.id && detalleProducto && (
                <div className="fila-producto-detalle">
                  <h3>Imagen</h3>
                  <form
                    className="formulario-imagen"
                    onSubmit={(e) => guardarImagen(e, producto.id)}
                  >
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) setImagenEditando(e.target.value);
                      }}
                    >
                      <option value="">
                        {imagenesDisponibles.length === 0
                          ? "No hay imágenes en productos/"
                          : "Elegir de la carpeta productos/"}
                      </option>
                      {imagenesDisponibles.map((img) => (
                        <option key={img.ruta} value={img.ruta}>
                          {img.nombre}
                        </option>
                      ))}
                    </select>
                    <input
                      value={imagenEditando}
                      onChange={(e) => setImagenEditando(e.target.value)}
                      placeholder="o pega una URL externa"
                    />
                    <button type="submit">Guardar imagen</button>
                  </form>
                  {imagenEditando && (
                    <img src={imagenEditando} alt="Vista previa" className="vista-previa-imagen" />
                  )}

                  <h3>Variantes (talla / color)</h3>
                  {detalleProducto.variantes?.length === 0 && (
                    <p>Este producto todavía no tiene variantes.</p>
                  )}
                  <ul className="lista-variantes">
                    {detalleProducto.variantes?.map((v) => (
                      <li key={v.id} className={`variante-${v.estadoStock?.toLowerCase()}`}>
                        <span>
                          {v.talla} / {v.color}
                        </span>
                        <span>SKU: {v.codigoSku}</span>
                        <span>Stock: {v.stockActual}</span>
                        <span className="etiqueta-estado">{v.estadoStock}</span>
                        <button
                          type="button"
                          className="boton-eliminar-variante"
                          onClick={() => eliminarVariante(producto.id, v.id)}
                          title="Eliminar variante"
                        >
                          🗑
                        </button>
                      </li>
                    ))}
                  </ul>

                  <form
                    className="formulario-variante"
                    onSubmit={(e) => crearVariante(e, producto.id)}
                  >
                    <input
                      placeholder="SKU"
                      value={formVariante.codigoSku}
                      onChange={(e) =>
                        setFormVariante({ ...formVariante, codigoSku: e.target.value })
                      }
                      required
                    />
                    <input
                      placeholder="Talla"
                      value={formVariante.talla}
                      onChange={(e) =>
                        setFormVariante({ ...formVariante, talla: e.target.value })
                      }
                      required
                    />
                    <input
                      placeholder="Color"
                      value={formVariante.color}
                      onChange={(e) =>
                        setFormVariante({ ...formVariante, color: e.target.value })
                      }
                      required
                    />
                    <input
                      type="number"
                      min="0"
                      placeholder="Stock inicial"
                      value={formVariante.stockInicial}
                      onChange={(e) =>
                        setFormVariante({ ...formVariante, stockInicial: e.target.value })
                      }
                    />
                    <input
                      type="number"
                      min="0"
                      placeholder="Stock mínimo"
                      value={formVariante.stockMinimo}
                      onChange={(e) =>
                        setFormVariante({ ...formVariante, stockMinimo: e.target.value })
                      }
                    />
                    <button type="submit">+ Agregar variante</button>
                  </form>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}