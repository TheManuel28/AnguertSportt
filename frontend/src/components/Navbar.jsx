import { Link, useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useCart } from "../context/CartContext";
import { useTiempoReal } from "../hooks/useTiempoReal";
import IndicadorEnVivo from "./IndicadorEnVivo";

export default function Navbar() {
  const { usuario, rol } = useAuth();
  const { tema, alternarTema } = useTheme();
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const esAdmin = rol === "administrador" || rol === "almacenero";

  async function cerrarSesion() {
    await signOut(auth);
    navigate("/");
  }

  const claseEnlace = (ruta) => (location.pathname === ruta ? "activo" : "");

  return (
    <header className="navbar">
      <Link to="/" className="navbar-marca">
        <img src="/logo-angher-sport.png" alt="Angher Sport" className="navbar-logo" />
      </Link>

            <nav className="navbar-enlaces">
        <Link
          to="/"
          className={claseEnlace("/")}
          title={esAdmin ? "Vista pública de la tienda, tal como la ve un cliente" : undefined}
        >
          {esAdmin ? "Ver tienda" : "Catálogo"}
        </Link>

        {usuario && esAdmin && (
          <>
            <Link to="/admin" className={claseEnlace("/admin")}>
              Dashboard
            </Link>
            <Link to="/admin/productos" className={claseEnlace("/admin/productos")}>
              Productos
            </Link>
            <Link to="/admin/inventario" className={claseEnlace("/admin/inventario")}>
              Inventario
            </Link>
            <Link to="/admin/pedidos" className={claseEnlace("/admin/pedidos")}>
              Pedidos
            </Link>
          </>
        )}

        {usuario && !esAdmin && (
          <Link to="/mis-pedidos" className={claseEnlace("/mis-pedidos")}>
            Mis pedidos
          </Link>
        )}
         <Link to="/admin/reportes" className={claseEnlace("/admin/reportes")}>
          Reportes
         </Link>
        {!esAdmin && (
          <Link to="/carrito" className={`navbar-carrito ${claseEnlace("/carrito")}`}>
            🛒 Carrito
            {totalItems > 0 && <span className="navbar-carrito-badge">{totalItems}</span>}
          </Link>
        )}
        
        {usuario && esAdmin && <IndicadorEnVivo />}

        <button
          type="button"
          className="navbar-tema-boton"
          onClick={alternarTema}
          aria-label={tema === "oscuro" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          title={tema === "oscuro" ? "Modo claro" : "Modo oscuro"}
        >
          {tema === "oscuro" ? "☀️" : "🌙"}
        </button>

        {usuario ? (
          <button type="button" className="navbar-boton" onClick={cerrarSesion}>
            Cerrar sesión
          </button>
        ) : (
          <Link to="/login" className={claseEnlace("/login")}>
            Iniciar sesión
          </Link>
        )}
      </nav>
    </header>
  );
}