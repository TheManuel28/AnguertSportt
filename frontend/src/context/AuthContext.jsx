import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [rol, setRol] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUsuario(user);
      if (user) {
        // El rol viaja como custom claim del token (ver backend/scripts/asignarRol.js).
        // Si no tiene claim asignado, se trata como "cliente" (comportamiento por defecto).
        const resultado = await user.getIdTokenResult();
        setRol(resultado.claims.rol || "cliente");
      } else {
        setRol(null);
      }
      setCargando(false);
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ usuario, rol, cargando }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}