/**
 * Manejo central de errores.
 *  - Errores "esperados" (400, 401, 403, 404, 409...): el mensaje se muestra tal cual.
 *  - Errores inesperados (500): en producción NO se devuelve el mensaje interno
 *    (puede revelar rutas o detalles de Firebase); solo queda en el log del servidor.
 *    Si un 5xx es un mensaje pensado para el usuario, se marca con `error.expose = true`.
 */
export function manejadorErrores(err, req, res, next) {
  const status = Number.isInteger(err.status) && err.status >= 400 && err.status < 600 ? err.status : 500;

  if (status >= 500) console.error(err);

  const esProduccion = process.env.NODE_ENV === "production";
  const mostrarMensaje = status < 500 || err.expose === true || !esProduccion;

  res.status(status).json({
    error: mostrarMensaje && err.message ? err.message : "Error interno del servidor",
  });
}