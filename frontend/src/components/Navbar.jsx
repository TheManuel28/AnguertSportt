import { useEffect, useState } from "react";
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
  const [menuAbierto, setMenuAbierto] = useState(false);

  const esAdmin = rol === "administrador" || rol === "almacenero";

  async function cerrarSesion() {
    setMenuAbierto(false);
    await signOut(auth);
    navigate("/");
  }

  const claseEnlace = (ruta) => (location.pathname === ruta ? "activo" : "");
  const cerrarMenu = () => setMenuAbierto(false);

  useEffect(() => {
    setMenuAbierto(false);
  }, [location.pathname]);

  return (
    <header className="navbar">
      <Link to="/" className="navbar-marca" onClick={cerrarMenu}>
        <img src="/logo-angher-sport.png" alt="Angher Sport" className="navbar-logo" />
      </Link>

      <button
        type="button"
        className={`navbar-menu-boton ${menuAbierto ? "abierto" : ""}`}
        aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={menuAbierto}
        aria-controls="navegacion-principal"
        onClick={() => setMenuAbierto((abierto) => !abierto)}
      >
        <span />
        <span />
        <span />
      </button>

      <nav id="navegacion-principal" className={`navbar-enlaces ${menuAbierto ? "abierto" : ""}`}>
        <Link
          to="/"
          className={claseEnlace("/")}
          title={esAdmin ? "Vista pública de la tienda, tal como la ve un cliente" : undefined}
          onClick={cerrarMenu}
        >
          {esAdmin ? "Ver tienda" : "Catálogo"}
        </Link>

        {usuario && esAdmin && (
          <>
            <Link to="/admin" className={claseEnlace("/admin")} onClick={cerrarMenu}>
              Dashboard
            </Link>
            <Link to="/admin/productos" className={claseEnlace("/admin/productos")} onClick={cerrarMenu}>
              Productos
            </Link>
            <Link to="/admin/inventario" className={claseEnlace("/admin/inventario")} onClick={cerrarMenu}>
              Inventario
            </Link>
            <Link to="/admin/pedidos" className={claseEnlace("/admin/pedidos")} onClick={cerrarMenu}>
              Pedidos
            </Link>
            <Link to="/admin/reportes" className={claseEnlace("/admin/reportes")} onClick={cerrarMenu}>
              Reportes
            </Link>
          </>
        )}

        {usuario && !esAdmin && (
          <Link to="/mis-pedidos" className={claseEnlace("/mis-pedidos")} onClick={cerrarMenu}>
            Mis pedidos
          </Link>
        )}
        {!esAdmin && (
          <Link to="/carrito" className={`navbar-carrito ${claseEnlace("/carrito")}`} onClick={cerrarMenu}>
            🛒 Carrito
            {totalItems > 0 && <span className="navbar-carrito-badge">{totalItems}</span>}
          </Link>
        )}
        
        {usuario && esAdmin && <IndicadorEnVivo />}

        <button
          type="button"
          className="navbar-tema-boton"
          onClick={() => {
            alternarTema();
            cerrarMenu();
          }}
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
          <Link to="/login" className={claseEnlace("/login")} onClick={cerrarMenu}>
            Iniciar sesión
          </Link>
        )}
      </nav>
    </header>
  );
}
