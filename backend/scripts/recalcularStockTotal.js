import { db } from "../src/config/firebase.js";

const aplicarCambios = process.argv.includes("--aplicar");

async function main() {
  const productosSnap = await db.collection("productos").get();
  const cambios = [];

  for (const productoDoc of productosSnap.docs) {
    const cambio = await db.runTransaction(async (tx) => {
      const productoSnap = await tx.get(productoDoc.ref);
      if (!productoSnap.exists) return null;

      const variantesSnap = await tx.get(
        db.collection("variantes").where("productoId", "==", productoDoc.id)
      );
      let stockCalculado = 0;
      let cantidadVariantes = 0;
      for (const varianteDoc of variantesSnap.docs) {
        const variante = varianteDoc.data();
        if (variante.activo !== true) continue;
        const stock = Number(variante.stockActual ?? 0);
        if (Number.isFinite(stock)) stockCalculado += stock;
        cantidadVariantes += 1;
      }

      const producto = productoSnap.data();
      const stockActual = Number(producto.stockTotal ?? 0);
      if (stockActual === stockCalculado) return null;

      if (aplicarCambios) {
        tx.update(productoDoc.ref, {
          stockTotal: stockCalculado,
          fechaActualizacion: new Date(),
        });
      }

      return {
        nombre: producto.nombre ?? productoDoc.id,
        anterior: stockActual,
        calculado: stockCalculado,
        variantes: cantidadVariantes,
      };
    });
    if (cambio) cambios.push(cambio);
  }

  if (cambios.length === 0) {
    console.log("Todos los stockTotal ya coinciden con la suma de las variantes activas.");
    return;
  }

  console.log(`${aplicarCambios ? "Se actualizarán" : "Vista previa — se actualizarían"} ${cambios.length} producto(s):`);
  for (const cambio of cambios) {
    console.log(
      `- ${cambio.nombre}: ${cambio.anterior} → ${cambio.calculado} (${cambio.variantes} variante(s) activa(s))`
    );
  }

  if (!aplicarCambios) {
    console.log("No se modificó Firestore. Vuelve a ejecutar con --aplicar para guardar estos totales.");
    return;
  }

  console.log("Recalculo terminado. El historial de movimientos no fue modificado.");
}

main()
  .catch((error) => {
    console.error("No se pudo recalcular el stock total:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.terminate();
  });
