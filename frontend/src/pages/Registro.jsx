import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { auth } from "../firebase";
import { api } from "../api/client";

export default function Registro() {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      // El usuario de Firebase Auth ya existe; ahora creamos su ficha de cliente
      await api.post("/clientes/registro", { nombre, telefono });
      navigate("/");
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        setError("Ese correo ya tiene una cuenta. Intenta iniciar sesión.");
      } else if (err.code === "auth/weak-password") {
        setError("La contraseña debe tener al menos 6 caracteres.");
      } else if (err.code === "auth/invalid-email") {
        setError("El correo no es válido.");
      } else {
        setError(err.message || "No se pudo completar el registro");
      }
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="login-page">
      <form onSubmit={handleSubmit}>
        <img src="/logo-angher-sport.png" alt="Angher Sport" className="login-logo" />
        <h2>Crear cuenta</h2>
        <p className="login-subtitulo">Regístrate para hacer pedidos en Angher Sport</p>

        <label className="campo">
          <span>Nombre completo</span>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        </label>

        <label className="campo">
          <span>Teléfono (opcional)</span>
          <input value={telefono} onChange={(e) => setTelefono(e.target.value)} />
        </label>

        <label className="campo">
          <span>Correo electrónico</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label className="campo">
          <span>Contraseña</span>
          <div className="campo-password">
            <input
              type={mostrarPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
            <button
              type="button"
              className="boton-ojo"
              onClick={() => setMostrarPassword((v) => !v)}
              aria-label={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {mostrarPassword ? "🙈" : "👁️"}
            </button>
          </div>
        </label>

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={cargando}>
          {cargando ? "Creando cuenta..." : "Crear cuenta"}
        </button>

        <p className="login-enlace-alterno">
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </p>
      </form>
    </div>
  );
}