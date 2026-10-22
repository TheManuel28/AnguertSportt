/**
 * Convierte un arreglo de objetos planos en un archivo .csv y dispara la
 * descarga en el navegador. No depende de ninguna librería: Excel abre CSV
 * de forma nativa. El BOM al inicio es para que Excel reconozca tildes/ñ
 * correctamente (si no, se ven mal los caracteres especiales).
 */
export function exportarCsv(nombreArchivo, filas) {
  if (!filas || filas.length === 0) return;

  const columnas = Object.keys(filas[0]);
  const SEPARADOR = ";"; // Excel en español (Perú) usa ";" como separador de columnas

  function escapar(valor) {
    const texto = String(valor ?? "");
    if (texto.includes(SEPARADOR) || texto.includes('"') || texto.includes("\n")) {
      return `"${texto.replace(/"/g, '""')}"`;
    }
    return texto;
  }

  const lineas = [
    columnas.join(SEPARADOR),
    ...filas.map((fila) => columnas.map((c) => escapar(fila[c])).join(SEPARADOR)),
  ];

  const contenido = "\uFEFF" + lineas.join("\n");
  const blob = new Blob([contenido], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  enlace.click();

  URL.revokeObjectURL(url);
}