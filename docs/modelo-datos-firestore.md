# Modelo de datos — Firestore (Angher Sport, AS-06)

Colecciones raíz. Las variantes van en colección propia (no como array dentro
del producto) para permitir actualizaciones atómicas de stock por transacción,
sin reescribir el documento completo del producto.

## usuarios/{uid}
Coincide con el uid de Firebase Auth. El rol también se guarda como
custom claim en Auth (ver backend/scripts/asignarRol.js) para poder
validarlo en cada request sin leer Firestore.
- nombre, email, rol ("administrador" | "almacenero" | "cliente"), activo,
  fechaCreacion, ultimoAcceso

## categorias/{categoriaId}
- nombre, descripcion, activo

## productos/{productoId}
- codigo (único), nombre, categoriaId, categoriaNombre (desnormalizado),
  descripcion, precioVenta, tieneVariantes, stockTotal (agregado, suma de
  sus variantes), activo, fechaCreacion, fechaActualizacion

## variantes/{varianteId}  — colección raíz, NO subcolección
- productoId, productoNombre (desnormalizado), codigoSku (único), talla,
  color, stockActual (única fuente de verdad del stock), stockMinimo,
  estadoStock ("NORMAL"|"BAJO"|"AGOTADO", calculado en cada escritura),
  activo, fechaActualizacion

## movimientos/{movimientoId} — INMUTABLE: solo se crea, nunca se edita
- tipo ("ENTRADA"|"SALIDA"|"AJUSTE"), varianteId, productoId, codigoSku,
  productoNombre, talla, color, cantidad, stockAnterior, stockResultante,
  motivo, observacion, usuarioId, usuarioNombre, fecha,
  movimientoRevertidoId (para reversiones trazables)

Motivos sugeridos [validar con la empresa]:
Entradas: PRODUCCION, COMPRA, DEVOLUCION_CLIENTE, AJUSTE_POSITIVO
Salidas: VENTA, PEDIDO_MAYORISTA, MERMA, MUESTRA, AJUSTE_NEGATIVO

## clientes/{clienteId}
- uid (referencia al usuario de Firebase Auth), nombre, email, telefono,
  fechaRegistro

## pedidos/{pedidoId}
- clienteId, items: [{ varianteId, productoNombre, talla, color, cantidad,
  precioUnitario, subtotal }], total, pagoInicial (50%), pagoRestante (50%),
  estadoPago, estado ("PENDIENTE_PAGO_INICIAL"|"CONFIRMADO"|
  "EN_PREPARACION"|"LISTO_PARA_ENTREGA"|"ENTREGADO"|"CANCELADO"),
  observacion, fechaCreacion, fechaActualizacion

## alertas/{alertaId}  (opcional — se puede derivar de variantes.estadoStock)
- varianteId, codigoSku, productoNombre, tipo ("STOCK_BAJO"|"AGOTADO"),
  stockActual, stockMinimo, estado ("ACTIVA"|"ATENDIDA"), fechaGeneracion,
  fechaAtencion

## consultas_ia/{consultaId}  (trazabilidad del asistente — módulo 7)
- usuarioId, usuarioNombre, pregunta, herramientasUsadas, datosConsultados,
  respuesta, tiempoRespuestaMs, fecha

## auditoria/{eventoId}  (módulo transversal de seguridad)
- usuarioId, usuarioNombre, accion, entidad, entidadId, datosAnteriores,
  datosNuevos, fecha

## Reglas de implementación que no hay que saltarse
1. Todo movimiento de inventario se escribe en una transacción de Firestore
   (ver backend/src/services/inventarioService.js) que actualiza variante,
   producto y movimiento a la vez. Si algo falla, no se aplica nada.
2. La salida se valida antes de aplicarse (cantidad <= stockActual), salvo
   que la empresa autorice stock negativo.
3. Los movimientos son inmutables: un error se corrige con un movimiento
   inverso que referencia al original (movimientoRevertidoId), nunca
   editando o borrando el original.
4. Índices compuestos recomendados: variantes por (estadoStock, activo),
   movimientos por (varianteId, fecha desc) y por (tipo, fecha desc),
   pedidos por (clienteId, fechaCreacion desc).
5. Reglas de seguridad de Firestore (firestore.rules) deniegan todo acceso
   directo desde el cliente: solo el Admin SDK del backend puede leer o
   escribir.
