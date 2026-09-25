import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { CartProvider } from "./context/CartContext";
import Layout from "./components/Layout";

import Login from "./pages/Login";
import Registro from "./pages/Registro";
import Catalogo from "./pages/Catalogo";
import ProductoDetalle from "./pages/ProductoDetalle";
import Carrito from "./pages/Carrito";
import MisPedidos from "./pages/MisPedidos";
import Dashboard from "./pages/Dashboard";
import AdminProductos from "./pages/AdminProductos";
import AdminInventario from "./pages/AdminInventario";
import AdminPedidos from "./pages/AdminPedidos";

// Cualquier usuario autenticado (cliente, almacenero o administrador)
function RutaPrivada({ children }) {
  const { usuario, cargando } = useAuth();
  if (cargando) return <p style={{ padding: "2rem" }}>Cargando...</p>;
  return usuario ? children : <Navigate to="/login" />;
}

// Solo administrador o almacenero. Un cliente que intente entrar por URL
// directa a /admin/* es redirigido al catálogo, no ve el panel.
function RutaAdmin({ children }) {
  const { usuario, rol, cargando } = useAuth();
  if (cargando) return <p style={{ padding: "2rem" }}>Cargando...</p>;
  if (!usuario) return <Navigate to="/login" />;
  if (rol !== "administrador" && rol !== "almacenero") return <Navigate to="/" />;
  return children;
}

function AppRoutes() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Catalogo />} />
        <Route path="/producto/:id" element={<ProductoDetalle />} />
        <Route path="/carrito" element={<Carrito />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />

        <Route
          path="/mis-pedidos"
          element={
            <RutaPrivada>
              <MisPedidos />
            </RutaPrivada>
          }
        />

        <Route
          path="/admin"
          element={
            <RutaAdmin>
              <Dashboard />
            </RutaAdmin>
          }
        />
        <Route
          path="/admin/productos"
          element={
            <RutaAdmin>
              <AdminProductos />
            </RutaAdmin>
          }
        />
        <Route
          path="/admin/inventario"
          element={
            <RutaAdmin>
              <AdminInventario />
            </RutaAdmin>
          }
        />
        <Route
          path="/admin/pedidos"
          element={
            <RutaAdmin>
              <AdminPedidos />
            </RutaAdmin>
          }
        />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}