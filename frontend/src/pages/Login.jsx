import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { auth } from "../firebase";

export default function Login() {
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
      const credencial = await signInWithEmailAndPassword(auth, email, password);
      const resultado = await credencial.user.getIdTokenResult();
      const rol = resultado.claims.rol || "cliente";
      navigate(rol === "administrador" || rol === "almacenero" ? "/admin" : "/");
    } catch (err) {
      setError("Correo o contraseña incorrectos");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="login-page">
      <form onSubmit={handleSubmit}>
        <img src="/logo-angher-sport.png" alt="Angher Sport" className="login-logo" />
        <h2>Iniciar sesión</h2>
        <p className="login-subtitulo">Ingresa con tu cuenta de Angher Sport</p>

        <label className="campo">
          <span>Correo electrónico</span>
          <input
            type="email"
            placeholder="tucorreo@ejemplo.com"
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
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="boton-ojo"
              onClick={() => setMostrarPassword((v) => !v)}
              aria-label={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              title={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {mostrarPassword ? "🙈" : "👁️"}
            </button>
          </div>
        </label>

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={cargando}>
          {cargando ? "Ingresando..." : "Iniciar sesión"}
        </button>

        <p className="login-enlace-alterno">
          ¿Eres cliente nuevo? <Link to="/registro">Crea tu cuenta</Link>
        </p>
      </form>
    </div>
  );
}