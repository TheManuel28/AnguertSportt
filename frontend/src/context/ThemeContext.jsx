import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);
const CLAVE_STORAGE = "angher-tema";

function obtenerTemaInicial() {
  const guardado = localStorage.getItem(CLAVE_STORAGE);
  if (guardado === "claro" || guardado === "oscuro") return guardado;

  const prefiereOscuro =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  return prefiereOscuro ? "oscuro" : "claro";
}

export function ThemeProvider({ children }) {
  const [tema, setTema] = useState(obtenerTemaInicial);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", tema);
    localStorage.setItem(CLAVE_STORAGE, tema);
  }, [tema]);

  function alternarTema() {
    setTema((actual) => (actual === "claro" ? "oscuro" : "claro"));
  }

  return (
    <ThemeContext.Provider value={{ tema, alternarTema }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}