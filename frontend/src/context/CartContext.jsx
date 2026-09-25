import { createContext, useContext, useEffect, useState } from "react";

const CartContext = createContext(null);
const CLAVE_STORAGE = "angher-carrito";

function cargarCarritoInicial() {
  try {
    const guardado = localStorage.getItem(CLAVE_STORAGE);
    return guardado ? JSON.parse(guardado) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(cargarCarritoInicial);

  useEffect(() => {
    localStorage.setItem(CLAVE_STORAGE, JSON.stringify(items));
  }, [items]);

  function agregarItem(nuevoItem) {
    setItems((prev) => {
      const existente = prev.find((i) => i.varianteId === nuevoItem.varianteId);
      if (existente) {
        return prev.map((i) =>
          i.varianteId === nuevoItem.varianteId
            ? { ...i, cantidad: i.cantidad + nuevoItem.cantidad }
            : i
        );
      }
      return [...prev, nuevoItem];
    });
  }

  function actualizarCantidad(varianteId, cantidad) {
    if (cantidad <= 0) {
      quitarItem(varianteId);
      return;
    }
    setItems((prev) => prev.map((i) => (i.varianteId === varianteId ? { ...i, cantidad } : i)));
  }

  function quitarItem(varianteId) {
    setItems((prev) => prev.filter((i) => i.varianteId !== varianteId));
  }

  function vaciarCarrito() {
    setItems([]);
  }

  const totalItems = items.reduce((acc, i) => acc + i.cantidad, 0);
  const totalPrecio = items.reduce((acc, i) => acc + i.cantidad * i.precioUnitario, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        agregarItem,
        actualizarCantidad,
        quitarItem,
        vaciarCarrito,
        totalItems,
        totalPrecio,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}