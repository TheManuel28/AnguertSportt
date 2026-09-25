// Utilidad de configuración inicial: asigna el rol (custom claim) a un
// usuario ya registrado en Firebase Auth. Firebase no tiene roles nativos,
// por eso el backend los guarda como custom claim y los lee en cada request
// (ver src/middleware/auth.js).
//
// Uso:
//   node scripts/asignarRol.js <uid> <administrador|almacenero|cliente>
//
// El <uid> se obtiene de Firebase Console -> Authentication -> Users.

import "dotenv/config";
import { auth } from "../src/config/firebase.js";

const [, , uid, rol] = process.argv;
const ROLES_VALIDOS = ["administrador", "almacenero", "cliente"];

if (!uid || !ROLES_VALIDOS.includes(rol)) {
  console.log("Uso: node scripts/asignarRol.js <uid> <administrador|almacenero|cliente>");
  process.exit(1);
}

await auth.setCustomUserClaims(uid, { rol });
console.log(`Rol "${rol}" asignado al usuario ${uid}`);
process.exit(0);
